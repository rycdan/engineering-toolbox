/**
 * Extract the NIST cryogenic material-property fits from saved page snapshots
 * into src/data/nist-cryogenic/dataset.json (and the regenerator table into
 * regenerator-volumetric-heat-capacity.json).
 *
 *   npm run data:nist          # regenerate
 *
 * The extractor is strict: unknown row labels, unparseable numbers, and
 * unconsumed coefficient tables are errors. Every normalization it applies is
 * recorded in the model's `notes`. tests/unit/nistExtract.test.ts checks that
 * the committed JSON equals a fresh extraction.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { MATERIALS, type MaterialConfig } from './materials.ts'
import type { Equation, Segment } from '../../src/engineering/cryogenic/equations.ts'
import type { CryoDataset, CryoMaterial, CryoProperty, CryoPropertyModel, CryoUnit, FitError } from '../../src/data/nist-cryogenic/types.ts'

export const EXTRACTOR_VERSION = '1.0.0'
export const SNAPSHOT_DIR = 'data-sources/nist-cryogenic/2026-10-23'
const MANIFEST = JSON.parse(readFileSync(`${SNAPSHOT_DIR}/MANIFEST.json`, 'utf8')) as {
  indexUrl: string
  retrieved: string
  pages: { nistName: string; url: string; file: string; sha256: string }[]
}

// ------------------------------------------------------------------ HTML

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ge: '≥', le: '≤', bull: '•', deg: '°', micro: 'µ',
  middot: '·', plusmn: '±', minus: '−', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', times: '×',
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** Text of an HTML fragment. Only "<" followed by a tag name starts a tag, so "T < 15K" survives. */
export function cellText(html: string): string {
  const text = html
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^$1')
    .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '_$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-z!][^>]*>/gi, ' ')
  return decodeEntities(text).replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

/** Innermost tables as rows of cell text. */
export function htmlTables(html: string): string[][][] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  const tables: string[][][] = []
  for (const m of clean.matchAll(/<table[^>]*>((?:(?!<table)[\s\S])*?)<\/table>/gi)) {
    const rows: string[][] = []
    for (const tr of m[1]!.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      rows.push([...tr[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cellText(c[1]!)))
    }
    tables.push(rows)
  }
  return tables
}

// --------------------------------------------------------------- parsing

const EMPTY = new Set(['', 'na', '.', '..', '---'])

/** Parse a coefficient cell. Returns null for blank/NA markers; throws on anything else unexpected. */
export function parseCoefficient(raw: string, notes: Set<string>): number | null {
  const t = raw.trim()
  if (EMPTY.has(t.toLowerCase())) return null
  const compact = t.replace(/\s+/g, '')
  if (compact !== t) notes.add(`Spaces inside the published number "${t}" were removed.`)
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(compact)) throw new Error(`Unparseable coefficient "${raw}"`)
  return Number(compact)
}

export function parseRange(raw: string): [number, number] {
  const m = raw.trim().match(/^(\d*\.?\d+)\s*K?\s*-\s*(\d*\.?\d+)\s*K?$/i)
  if (!m) throw new Error(`Unparseable range "${raw}"`)
  return [Number(m[1]), Number(m[2])]
}

function parseKelvin(raw: string): number {
  const m = raw.trim().match(/^(\d*\.?\d+)\s*K$/i)
  if (!m) throw new Error(`Unparseable temperature "${raw}"`)
  return Number(m[1])
}

function classify(header: string): CryoProperty {
  const h = header.toLowerCase()
  if (h.includes('thermal conductivity')) return 'thermal-conductivity'
  if (h.includes('specific heat')) return 'specific-heat'
  if (h.includes('linear expansion')) return 'linear-expansion'
  if (h.includes('expansion coefficient')) return 'expansion-coefficient'
  if (h.includes('young')) return 'youngs-modulus'
  throw new Error(`Unknown property header "${header}"`)
}

const PROPERTY_PHRASE: Record<CryoProperty, RegExp> = {
  'thermal-conductivity': /thermal conductivity/i,
  'specific-heat': /specific heat/i,
  'linear-expansion': /linear expansion/i,
  'expansion-coefficient': /(thermal )?expansion coefficient/i,
  'youngs-modulus': /young'?s modulus/i,
}

export function variantOf(header: string, property: CryoProperty): string | null {
  let v = header.replace(PROPERTY_PHRASE[property], '').trim()
  v = v.replace(/\s*\^\s*(\d)/g, (_, d: string) => ({ '2': '²', '3': '³' })[d] ?? `^${d}`)
  v = v.replace(/\s*_(\d)/g, (_, d: string) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!)
  v = v.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim()
  if (/^\(.*\)$/.test(v) && !v.slice(1, -1).includes('(')) v = v.slice(1, -1).trim()
  return v === '' ? null : v
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[³]/g, '3')
    .replace(/[²]/g, '2')
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface Column {
  header: string
  property: CryoProperty
  units: string
  coeffs: Map<string, number | null>
  tLow: number | null
  f: number | null
  dataRange: string | null
  equationRange: string | null
  lowRange: string | null
  highRange: string | null
  fit: { label: string; text: string }[]
  notes: Set<string>
}

const ROW_KEYS: [RegExp, string][] = [
  [/^\.?\s*units$/i, 'units'],
  [/^t[ _]?low \(k\)$/i, 'tlow'],
  [/^f>$/i, 'flow'],
  [/^data range( \(k\))?$/i, 'data'],
  [/^equation range( \(k\))?$/i, 'equation'],
  [/^low range$/i, 'lowrange'],
  [/^high range$/i, 'highrange'],
  [/^curve fit .*$/i, 'fit'],
  [/^[a-l]$/i, 'coef'],
]

function keyOf(label: string): string {
  for (const [re, key] of ROW_KEYS) if (re.test(label.trim())) return key
  throw new Error(`Unknown row label "${label}"`)
}

/** Coefficient tables: first column runs a, b, c, … */
function isCoefficientTable(rows: string[][]): boolean {
  const labels = rows.map((r) => (r[0] ?? '').trim().toLowerCase())
  const ia = labels.indexOf('a')
  return ia > 0 && labels[ia + 1] === 'b'
}

function readColumns(rows: string[][]): Column[] {
  const header = rows[0]!
  const width = header.length
  const cols: Column[] = []
  for (let c = 1; c < width; c++) {
    const h = header[c]!.trim()
    cols.push({
      header: h, property: classify(h), units: '', coeffs: new Map(), tLow: null, f: null,
      dataRange: null, equationRange: null, lowRange: null, highRange: null, fit: [], notes: new Set(),
    })
  }
  for (const row of rows.slice(1)) {
    const label = (row[0] ?? '').trim()
    const key = keyOf(label)
    cols.forEach((col, i) => {
      const cell = (row[i + 1] ?? '').trim()
      switch (key) {
        case 'units': col.units = cell; break
        case 'coef': col.coeffs.set(label.toLowerCase(), parseCoefficient(cell, col.notes)); break
        case 'tlow': col.tLow = parseCoefficient(cell, col.notes); break
        case 'flow': col.f = parseCoefficient(cell, col.notes); break
        case 'data': col.dataRange = cell; break
        case 'equation': col.equationRange = cell; break
        case 'lowrange': col.lowRange = cell; break
        case 'highrange': col.highRange = cell; break
        case 'fit': col.fit.push({ label, text: cell }); break
      }
    })
  }
  return cols
}

// ------------------------------------------------------------ equations

type SpecialForm = 'nist-copper-k' | 'nist-kevlar-k' | 'nist-silicon-cte'

/** Pages whose equation is not the standard form for the property (verified against the page text/images). */
const SPECIAL_FORMS: Record<string, Partial<Record<CryoProperty, SpecialForm>>> = {
  'Copper_OFHC.htm': { 'thermal-conductivity': 'nist-copper-k' },
  'Kevlar_49_Fiber.htm': { 'thermal-conductivity': 'nist-kevlar-k' },
  'Kevlar_49_Composite.htm': { 'thermal-conductivity': 'nist-kevlar-k' },
  'Silicon.htm': { 'expansion-coefficient': 'nist-silicon-cte' },
}

const EQUATION_TEXT: Record<Equation['form'], string> = {
  constant: 'y = f',
  polynomial: 'y = a + bT + cT² + dT³ + eT⁴ (T > T_low); y = f (T < T_low)',
  'log10-polynomial': 'log₁₀ y = a + b·log₁₀T + c·(log₁₀T)² + … + i·(log₁₀T)⁸',
  'nist-copper-k': 'log₁₀ k = (a + c·T^0.5 + e·T + g·T^1.5 + i·T²) / (1 + b·T^0.5 + d·T + f·T^1.5 + h·T²)',
  'nist-kevlar-k':
    'log₁₀ k = (a + b·x)·(1 − erf(2(x − c)))/2 + (d + e·exp(−x/f))·(1 + erf(2(x − c)))/2, x = log₁₀T (published as an image; transcribed)',
  'nist-silicon-cte':
    'α = {(4.8×10⁻⁵T³ + (aT⁵ + bT^5.5 + cT⁶ + dT^6.5 + eT⁷)(1 + erf(T − 15))/2)(1 − erf(0.2(T − 52)))/2 + (−47.6 + f(T − 76)² + g(T − 76)³ + h(T − 76)⁹)(1 + erf(0.2(T − 52)))/2·(1 − erf(0.1(T − 200)))/2 + (i + j/T + k/T² + l/T³)(1 + erf(0.1(T − 200)))/2} ×10⁻⁸/K (published as an image; transcribed)',
  tabulated: 'tabulated values, linear interpolation',
}

const COEFFICIENT_COUNT: Record<Exclude<Equation['form'], 'constant' | 'tabulated'>, number> = {
  polynomial: 5,
  'log10-polynomial': 9,
  'nist-copper-k': 9,
  'nist-kevlar-k': 6,
  'nist-silicon-cte': 12,
}

function coefficients(col: Column, count: number): number[] {
  const out: number[] = []
  const missing: string[] = []
  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(97 + i)
    if (!col.coeffs.has(letter)) throw new Error(`${col.header}: coefficient ${letter} missing`)
    const v = col.coeffs.get(letter)
    if (v === null || v === undefined) missing.push(letter)
    out.push(v ?? 0)
  }
  for (const letter of col.coeffs.keys()) {
    if (letter.charCodeAt(0) - 97 >= count) {
      const v = col.coeffs.get(letter)
      if (v !== null && v !== undefined && v !== 0) throw new Error(`${col.header}: unexpected non-zero coefficient ${letter}`)
    }
  }
  if (missing.length > 0) col.notes.add(`Coefficient(s) ${missing.join(', ')} are blank or "---" on the page and are treated as 0.`)
  return out
}

function unitFor(col: Column): { unit: CryoUnit; scale: number } {
  const u = col.units.replace(/\s+/g, ' ')
  switch (col.property) {
    case 'thermal-conductivity':
      if (!/W\s*\/\s*\(?m/i.test(u)) throw new Error(`Unexpected k units "${u}"`)
      return { unit: 'W/(m·K)', scale: 1 }
    case 'specific-heat':
      if (!/J\s*\/\s*\(?kg/i.test(u)) throw new Error(`Unexpected cp units "${u}"`)
      return { unit: 'J/(kg·K)', scale: 1 }
    case 'youngs-modulus':
      if (!/GPa/.test(u)) throw new Error(`Unexpected E units "${u}"`)
      return { unit: 'GPa', scale: 1 }
    case 'linear-expansion':
      if (!/L\s*-\s*L\s*_\s*293/.test(u) || !/10\s*\^\s*5/.test(u)) throw new Error(`Unexpected expansion units "${u}"`)
      return { unit: 'm/m', scale: 1e-5 }
    case 'expansion-coefficient': {
      const m = u.match(/10\s*\^\s*-\s*(\d+)\s*\/\s*K/)
      if (!m) throw new Error(`Unexpected CTE units "${u}"`)
      return { unit: '1/K', scale: 10 ** -Number(m[1]) }
    }
  }
}

function ranges(col: Column): { equation: [number, number]; data: [number, number] | null; equationText: string; dataText: string | null } {
  if (col.equationRange !== null) {
    return {
      equation: parseRange(col.equationRange),
      data: col.dataRange === null ? null : parseRange(col.dataRange),
      equationText: col.equationRange,
      dataText: col.dataRange,
    }
  }
  if (col.lowRange !== null && col.highRange !== null) {
    col.notes.add('The page gives a single "low range"/"high range" pair; it is used as the equation range and no separate data range is stated.')
    return { equation: [parseKelvin(col.lowRange), parseKelvin(col.highRange)], data: null, equationText: `${col.lowRange}–${col.highRange}`, dataText: null }
  }
  throw new Error(`${col.header}: no range`)
}

function fitErrors(col: Column): FitError[] {
  return col.fit.map(({ label, text }) => {
    const percent = /% error/i.test(label) && /^\d+(\.\d+)?$/.test(text.trim()) ? Number(text) : null
    return { label, text, percent }
  })
}

/** Segments for one source column. `ownsUpper` = whether the column's upper bound is inclusive. */
function columnSegments(col: Column, form: Equation['form'], eqRange: [number, number], ownsUpper: boolean): Segment[] {
  const [lo, hi] = eqRange
  const upper = { kelvin: hi, inclusive: ownsUpper }
  if (form === 'polynomial') {
    const poly: Equation = { form: 'polynomial', coefficients: coefficients(col, COEFFICIENT_COUNT.polynomial) }
    if (col.tLow !== null) {
      if (col.f === null) throw new Error(`${col.header}: T_low without f`)
      if (col.tLow <= lo) {
        col.notes.add(`T_low (${col.tLow} K) is at or below the equation range start; the constant segment is unused.`)
        return [{ lower: { kelvin: lo, inclusive: true }, upper, equation: poly }]
      }
      return [
        { lower: { kelvin: lo, inclusive: true }, upper: { kelvin: col.tLow, inclusive: false }, equation: { form: 'constant', value: col.f } },
        { lower: { kelvin: col.tLow, inclusive: true }, upper, equation: poly },
      ]
    }
    return [{ lower: { kelvin: lo, inclusive: true }, upper, equation: poly }]
  }
  if (form === 'constant' || form === 'tabulated') throw new Error('not a column form')
  return [{ lower: { kelvin: lo, inclusive: true }, upper, equation: { form, coefficients: coefficients(col, COEFFICIENT_COUNT[form]) } as Equation }]
}

/**
 * Columns that the page splits over adjacent temperature ranges and that form
 * one piecewise model. Indexes count columns of that property in page order.
 * The upper column owns the shared temperature.
 */
const MERGES: { file: string; property: CryoProperty; groups: number[][] }[] = [
  { file: 'Polystyrene.htm', property: 'linear-expansion', groups: [[0, 1], [2, 3]] },
  { file: 'Stainless_Steel_304.htm', property: 'youngs-modulus', groups: [[0, 1]] },
  { file: 'Stainless_Steel_316.htm', property: 'youngs-modulus', groups: [[0, 1]] },
  { file: 'Stainless_Steel_310.htm', property: 'specific-heat', groups: [[0, 1]] },
  { file: 'Stainless_Steel_316.htm', property: 'specific-heat', groups: [[0, 1]] },
]

function formFor(file: string, property: CryoProperty): Equation['form'] {
  const special = SPECIAL_FORMS[file]?.[property]
  if (special) return special
  return property === 'linear-expansion' || property === 'youngs-modulus' ? 'polynomial' : 'log10-polynomial'
}

function buildModels(cfg: MaterialConfig, cols: Column[]): CryoPropertyModel[] {
  const byProperty = new Map<CryoProperty, Column[]>()
  for (const c of cols) byProperty.set(c.property, [...(byProperty.get(c.property) ?? []), c])
  const models: CryoPropertyModel[] = []
  const usedIds = new Set<string>()

  for (const [property, pcols] of byProperty) {
    const merge = MERGES.find((m) => m.file === cfg.file && m.property === property)
    const groups: Column[][] = merge
      ? merge.groups.map((g) => g.map((i) => pcols[i]!))
      : pcols.map((c) => [c])
    if (merge && merge.groups.flat().length !== pcols.length) throw new Error(`${cfg.file}: merge config does not cover all ${property} columns`)

    for (const group of groups) {
      const form = formFor(cfg.file, property)
      const notes = new Set<string>()
      const segments: Segment[] = []
      const rangesList = group.map(ranges)
      group.forEach((col, i) => {
        const isLast = i === group.length - 1
        if (!isLast && rangesList[i]!.equation[1] !== rangesList[i + 1]!.equation[0]) {
          throw new Error(`${cfg.file}: merged ${property} ranges do not abut`)
        }
        segments.push(...columnSegments(col, form, rangesList[i]!.equation, isLast))
        col.notes.forEach((n) => notes.add(n))
      })
      if (group.length > 1) {
        notes.add(
          `The page publishes this property as ${group.length} columns over adjacent temperature ranges (${rangesList.map((r) => r.equationText).join('; ')}); they are combined into one piecewise model, and each shared boundary temperature uses the higher-range fit.`,
        )
      }
      const units = unitFor(group[0]!)
      const variants = [...new Set(group.map((c) => variantOf(c.header, property)))]
      const variant = group.length > 1 && variants.every((v) => v === null || /^\d$/.test(v)) ? null : variants[0] ?? null
      const lowCol = group[0]!
      const eqRange: [number, number] = [rangesList[0]!.equation[0], rangesList.at(-1)!.equation[1]]
      const dataRanges = rangesList.map((r) => r.data)
      const dataRange: [number, number] | null = dataRanges.every((d) => d !== null)
        ? [Math.min(...dataRanges.map((d) => d![0])), Math.max(...dataRanges.map((d) => d![1]))]
        : null
      let id = `${cfg.id}/${property}${variant ? `/${slug(variant)}` : ''}`
      for (let n = 2; usedIds.has(id); n++) id = `${cfg.id}/${property}/${n}`
      usedIds.add(id)
      models.push({
        id,
        property,
        variant,
        sourceHeaders: group.map((c) => c.header),
        sourceUnits: lowCol.units,
        unit: units.unit,
        scale: units.scale,
        segments,
        equationRangeK: eqRange,
        dataRangeK: dataRange,
        equationRangeText: rangesList.map((r) => r.equationText).join('; '),
        dataRangeText: rangesList.every((r) => r.dataText === null) ? null : rangesList.map((r) => r.dataText ?? 'not stated').join('; '),
        fitError: group.flatMap((c, i) =>
          fitErrors(c).map((fe) => (group.length > 1 ? { ...fe, label: `${fe.label} (${rangesList[i]!.equationText})` } : fe)),
        ),
        equationText: EQUATION_TEXT[form],
        lowTemperatureConstant: lowCol.tLow !== null && lowCol.f !== null ? { tLowK: lowCol.tLow, value: lowCol.f } : null,
        notes: [...notes],
      })
    }
  }
  return models
}

// -------------------------------------------------------------- dataset

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

export function extractMaterial(cfg: MaterialConfig): CryoMaterial {
  const page = MANIFEST.pages.find((p) => p.file === `pages/${cfg.file}`)
  if (!page) throw new Error(`No manifest entry for ${cfg.file}`)
  const buf = readFileSync(`${SNAPSHOT_DIR}/pages/${cfg.file}`)
  if (sha256(buf) !== page.sha256) throw new Error(`${cfg.file}: snapshot hash does not match MANIFEST.json`)
  const material: CryoMaterial = {
    id: cfg.id, name: cfg.name, nistName: page.nistName, family: cfg.family, subfamily: cfg.subfamily,
    url: page.url, snapshotFile: `${SNAPSHOT_DIR}/${page.file}`, sha256: page.sha256,
    identityNotes: cfg.identityNotes, models: [], unsupported: [],
  }
  if (cfg.id === 'regenerator-materials') {
    material.unsupported.push('Tabulated volumetric heat capacity (no fitted equation); extracted to regenerator-volumetric-heat-capacity.json and not used by any calculator yet.')
    return material
  }
  const tables = htmlTables(buf.toString('latin1')).filter(isCoefficientTable)
  if (tables.length === 0) throw new Error(`${cfg.file}: no coefficient tables found`)
  material.models = buildModels(cfg, tables.flatMap(readColumns))
  material.unsupported.push('Property plots on the page (images) are not reproduced.')
  return material
}

export interface RegeneratorTable {
  source: string
  url: string
  snapshotFile: string
  unit: 'J/(cm³·K)'
  quantity: 'volumetric heat capacity'
  /** Column names as published (subscript markers rendered as subscript digits). */
  materials: string[]
  /** Rows: [T (K), value for each material in `materials` order]; null = blank cell in the source. */
  rows: (number | null)[][]
}

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉'

export function extractRegenerator(): RegeneratorTable {
  const cfg = MATERIALS.find((m) => m.id === 'regenerator-materials')!
  const page = MANIFEST.pages.find((p) => p.file === `pages/${cfg.file}`)!
  const html = readFileSync(`${SNAPSHOT_DIR}/pages/${cfg.file}`).toString('latin1')
  // The data table wraps a nested placeholder table, so read every row in the document.
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const rows = [...clean.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((tr) =>
    [...tr[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => cellText(c[1]!)),
  )
  const header = rows.find((r) => r[0] === 'Temperature')
  if (!header) throw new Error('Regenerator header row not found')
  const names = header.slice(1).map((n) => n.replace(/\s*_(\d)/g, (_, d: string) => SUBSCRIPT[Number(d)]!))
  const data: (number | null)[][] = []
  for (const r of rows) {
    if (!/^\d+(\.\d+)?$/.test(r[0] ?? '')) continue
    if (r.length !== names.length + 1) throw new Error(`Regenerator row has ${r.length} cells, expected ${names.length + 1}`)
    const vals = r.map((c) => {
      if (c === '') return null
      const v = Number(c)
      if (!Number.isFinite(v)) throw new Error(`Bad regenerator cell "${c}"`)
      return v
    })
    if (vals[0] === null) throw new Error('Regenerator row without temperature')
    data.push(vals)
  }
  for (let i = 1; i < data.length; i++) if (!(data[i]![0]! > data[i - 1]![0]!)) throw new Error('Regenerator temperatures not increasing')
  return {
    source: 'NIST Cryogenic Material Properties: Regenerator Materials',
    url: page.url,
    snapshotFile: `${SNAPSHOT_DIR}/${page.file}`,
    unit: 'J/(cm³·K)',
    quantity: 'volumetric heat capacity',
    materials: names,
    rows: data,
  }
}

export function buildDataset(): CryoDataset {
  return {
    dataset: 'nist-cryogenic-material-properties',
    indexUrl: MANIFEST.indexUrl,
    retrieved: MANIFEST.retrieved,
    extractorVersion: EXTRACTOR_VERSION,
    materials: MATERIALS.map(extractMaterial),
  }
}

export const DATASET_PATH = 'src/data/nist-cryogenic/dataset.json'
export const REGENERATOR_PATH = 'src/data/nist-cryogenic/regenerator-volumetric-heat-capacity.json'

export function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataset = buildDataset()
  writeFileSync(DATASET_PATH, serialize(dataset))
  writeFileSync(REGENERATOR_PATH, serialize(extractRegenerator()))
  const models = dataset.materials.flatMap((m) => m.models)
  console.log(`Wrote ${DATASET_PATH}: ${dataset.materials.length} materials, ${models.length} models`)
}
