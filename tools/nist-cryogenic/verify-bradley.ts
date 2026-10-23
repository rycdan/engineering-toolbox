/**
 * Compare every dataset model with NIST's evaluated tables (Bradley &
 * Radebaugh, "Properties of Selected Materials at Cryogenic Temperatures").
 *
 *   node tools/nist-cryogenic/verify-bradley.ts
 *
 * Writes src/data/nist-cryogenic/bradley-verification.json. The benchmark test
 * (tests/benchmarks/nist-cryogenic-bradley.test.ts) recomputes it and fails on
 * any difference, so the committed status is always reproducible.
 *
 * Which materials the tables list comes from their column headers
 * (BRADLEY_HEADERS). Each model is then located by value: the column (by
 * horizontal position in the extracted text) whose printed numbers agree with
 * the evaluated equation. Several NIST materials share identical published
 * equations (e.g. 304/304L/310/316 linear expansion), so a match verifies the
 * values, not which header the column sits under.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { evaluateEquation, evaluateSegments, type Segment } from '../../src/engineering/cryogenic/equations.ts'
import type { CryoDataset, CryoPropertyModel } from '../../src/data/nist-cryogenic/types.ts'

export const LAYOUT_PATH = 'tests/benchmarks/data/bradley-radebaugh-layout.json'
export const VERIFICATION_PATH = 'src/data/nist-cryogenic/bradley-verification.json'

export interface LayoutRow {
  T: number
  cells: { x: number; text: string }[]
}
export interface Layout {
  pdfSha256: string
  pages: { page: number; quantity: string; rows: LayoutRow[] }[]
}

/** Agreement threshold attributed to coefficient rounding between the web page and the evaluated tables. */
export const AGREES_RELATIVE = 0.001

/**
 * Columns the evaluated tables list (from the PDF column headers), keyed by
 * dataset model id → header as printed. A model absent here is "not
 * tabulated"; one present but without an agreeing column "differs".
 */
export const BRADLEY_HEADERS: Record<string, string> = {
  // Thermal conductivity, pp. 5–7
  'al-1100/thermal-conductivity': 'Al 1100',
  'al-3003-f/thermal-conductivity': 'Al 3003',
  'al-5083-o/thermal-conductivity': 'Al 5083',
  'al-6061-t6/thermal-conductivity': 'Al 6061',
  'al-6063-t5/thermal-conductivity': 'Al 6063',
  'beryllium-copper/thermal-conductivity': 'Be-Cu',
  'brass/thermal-conductivity': 'Brass',
  'copper-ofhc/thermal-conductivity/rrr-50': 'Cu (OFHC) RRR=50',
  'copper-ofhc/thermal-conductivity/rrr-100': 'Cu (OFHC) RRR=100',
  'copper-ofhc/thermal-conductivity/rrr-300': 'Cu (OFHC) RRR=300',
  'g10-cr/thermal-conductivity/normal-direction': 'G-10 (norm-dir)',
  'g10-cr/thermal-conductivity/warp-direction': 'G-10 (warp-dir)',
  'inconel-718/thermal-conductivity': 'Inconel-718',
  'invar-36/thermal-conductivity': 'Invar (Fe-36Ni)',
  'kevlar-49-composite/thermal-conductivity': 'Kevlar-49 Composite',
  'kevlar-49-fiber/thermal-conductivity': 'Kevlar-49 Fiber',
  'lead/thermal-conductivity': 'Pb',
  'molybdenum/thermal-conductivity': 'Mo',
  'ni-steel-2-25/thermal-conductivity': 'Fe-2.25 Ni',
  'ni-steel-3-25/thermal-conductivity': 'Fe-3.5 Ni',
  'ni-steel-5-0/thermal-conductivity': 'Fe-5.0 Ni',
  'ni-steel-9-0/thermal-conductivity': 'Fe-9.0 Ni',
  'platinum/thermal-conductivity': 'Platinum',
  'polyamide-nylon/thermal-conductivity': 'Polyamide (Nylon)',
  'pet-mylar/thermal-conductivity': 'Polyethylene Terephthalate (Mylar)',
  'polyimide-kapton/thermal-conductivity': 'Polyimide (Kapton)',
  'polystyrene/thermal-conductivity/density-31.88-kg-m3-1.99-lb-ft3-freon-filled': 'Polystyrene 12.66 kg m-3 (sic; values match 31.88 kg/m³)',
  'polystyrene/thermal-conductivity/density-32.04-kg-m3-2.0-lb-ft3': 'Polystyrene 32.04 kg m-3',
  'polystyrene/thermal-conductivity/density-49.98-kg-m3-3.12-lb-ft3': 'Polystyrene 49.98 kg m-3',
  'polystyrene/thermal-conductivity/density-99.96-kg-m3-6.24-lb-ft3': 'Polystyrene 99.96 kg m-3',
  'polyurethane/thermal-conductivity/density-31.88-kg-m3-1.99-lb-ft3-freon-filled': 'Polyurethane 31.88 kg m-3',
  'polyurethane/thermal-conductivity/density-32.04-kg-m3-2.0-lb-ft3-co2-filled': 'Polyurethane 32.04 kg m-3',
  'polyurethane/thermal-conductivity/density-49.02-kg-m3-3.06-lb-ft3-he-filled': 'Polyurethane 49.02 kg m-3',
  'polyurethane/thermal-conductivity/density-64.08-kg-m3-4.00-lb-ft3-freon-filled': 'Polyurethane 64.08 kg m-3',
  'pvc/thermal-conductivity/density-20.02-kg-m3-1.25-lb-ft3-air-fill-gas': 'PVC 20.02 kg m-3',
  'pvc/thermal-conductivity/density-56.06-kg-m3-3.5-lb-ft3-co2-blown': 'PVC 56.06 kg m-3',
  'ss-304/thermal-conductivity': 'Stainless 304',
  'ss-304l/thermal-conductivity': 'Stainless 304L',
  'ss-310/thermal-conductivity': 'Stainless 310',
  'ss-316/thermal-conductivity': 'Stainless 316',
  'ptfe-teflon/thermal-conductivity': 'Teflon',
  'ti-6al-4v/thermal-conductivity': 'Ti-6Al-4V',
  'ti-15-3-3-3/thermal-conductivity': 'Ti 15-3-3-3',
  // Specific heat, pp. 8–9
  'al-3003-f/specific-heat': 'Al 3003',
  'al-5083-o/specific-heat': 'Al 5083',
  'al-6061-t6/specific-heat': 'Al 6061',
  'apiezon-n/specific-heat': 'Apiezon-N Grease',
  'beryllium/specific-heat': 'Be',
  'copper-ofhc/specific-heat': 'Cu (OFHC)',
  'g10-cr/specific-heat': 'G-10',
  'indium/specific-heat': 'Indium',
  'invar-36/specific-heat': 'Invar (Fe-36Ni)',
  'ni-steel-2-25/specific-heat': 'Fe-2.25Ni',
  'ni-steel-3-25/specific-heat': 'Fe-3.5Ni',
  'ni-steel-5-0/specific-heat': 'Fe-5.0Ni',
  'ni-steel-9-0/specific-heat': 'Fe-9.0Ni',
  'platinum/specific-heat': 'Platinum',
  'polyamide-nylon/specific-heat': 'Polyamide (Nylon)',
  'polyimide-kapton/specific-heat': 'Polyimide (Kapton)',
  'polystyrene/specific-heat/density-99.96-kg-m3-6.24-lb-ft3': 'Polystyrene 99.96 kg m-3',
  'polystyrene/specific-heat/density-9.93-kg-m3-.062-lb-ft3': 'Polystyrene 9.93 kg m-3',
  'polystyrene/specific-heat/density-60.07-kg-m3-3.75-lb-ft3': 'Polystyrene 6.07 kg m-3 (sic; values match 60.07 kg/m³)',
  'polyurethane/specific-heat/density-49.02-kg-m3-3.06-lb-ft3-he-filled': 'Polyurethane 49.02 kg m-3',
  'polyurethane/specific-heat/density-389.25-kg-m3-24.3-lb-ft3-air-filled': 'Polyurethane 389.25 kg m-3',
  'pvc/specific-heat/density-48.05-kg-m3-3.00-lb-ft3': 'Polyvinyl Chloride (PVC)',
  'ss-304/specific-heat': 'Stainless 304',
  'ss-304l/specific-heat': 'Stainless 304L',
  'ss-310/specific-heat': 'Stainless 310',
  'ss-316/specific-heat': 'Stainless 316',
  'ptfe-teflon/specific-heat': 'Teflon',
  // Linear expansion, pp. 10–12
  'al-3003-f/linear-expansion': 'Al 3003',
  'al-5083-o/linear-expansion': 'Al 5083',
  'al-6061-t6/linear-expansion': 'Al 6061',
  'beryllium/linear-expansion/a-axis': 'Be (//a-axis)',
  'beryllium/linear-expansion/c-axis': 'Be (//c-axis)',
  'beryllium/linear-expansion/polycrystalline': 'Be Polycrystalline',
  'beryllium-copper/linear-expansion': 'Be-Cu',
  'g10-cr/linear-expansion/normal-direction': 'G-10 (norm-dir)',
  'g10-cr/linear-expansion/warp-direction': 'G-10 (warp-dir)',
  'inconel-718/linear-expansion': 'Inconel-718',
  'invar-36/linear-expansion': 'Invar (Fe-36Ni)',
  'molybdenum/linear-expansion': 'Mo',
  'ni-steel-2-25/linear-expansion': 'Fe-2.25Ni',
  'ni-steel-3-25/linear-expansion': 'Fe-3.5Ni',
  'ni-steel-5-0/linear-expansion': 'Fe-5.0Ni',
  'ni-steel-9-0/linear-expansion': 'Fe-9.0Ni',
  'polyamide-nylon/linear-expansion': 'Polyamide (Nylon)',
  'polystyrene/linear-expansion/density-51.42-kg-m3-3.21-lb-ft3': 'Polystyrene 51.42 kg m-3',
  'polystyrene/linear-expansion/density-102.2-kg-m3-6.38-lb-ft3': 'Polystyrene 102.2 kg m-3',
  'polyurethane/linear-expansion/density-32.04-kg-m3-2.0-lb-ft3-freon-blown-parallel-to-foam-rise': 'Polyurethane 32.04 kg m-3',
  'polyurethane/linear-expansion/density-64.07-kg-m3-4.0-lb-ft3-co2-blown-parallel-to-foam-rise': 'Polyurethane 64.07 kg m-3',
  'pvc/linear-expansion': 'Polyvinyl Chloride (PVC)',
  'sapphire/linear-expansion': 'Sapphire',
  'ss-304/linear-expansion': 'Stainless 304',
  'ss-304l/linear-expansion': 'Stainless 304L',
  'ss-310/linear-expansion': 'Stainless 310',
  'ss-316/linear-expansion': 'Stainless 316',
  'ptfe-teflon/linear-expansion': 'Teflon',
  'ti-6al-4v/linear-expansion': 'Ti-6Al-4V',
  // CTE, p. 13
  'copper-ofhc/expansion-coefficient': 'Cu (OFHC)',
  'sapphire/expansion-coefficient': 'Sapphire',
  'silicon/expansion-coefficient': 'Si',
  // Young's modulus, p. 14
  'al-5083-o/youngs-modulus': 'Al 5083',
  'al-6061-t6/youngs-modulus': 'Al 6061',
  'invar-36/youngs-modulus': 'Invar (Fe-36Ni)',
  'ni-steel-2-25/youngs-modulus': 'Fe-2.25Ni',
  'ni-steel-3-25/youngs-modulus': 'Fe-3.5Ni',
  'ni-steel-5-0/youngs-modulus': 'Fe-5.0Ni',
  'ni-steel-9-0/youngs-modulus': 'Fe-9.0Ni',
  'ss-304/youngs-modulus': 'Stainless 304',
  'ss-310/youngs-modulus': 'Stainless 310',
  'ss-316/youngs-modulus': 'Stainless 316',
}

/**
 * Documented anomalies in the evaluated tables. Each changes which printed
 * cell is compared with which temperature or scale; none loosens the numeric
 * tolerance.
 */
const BE_PERCENT = 'The beryllium columns are printed in percent although the table header says 10⁻⁵ (printed value = y × 10⁻³).'
const PRINTED_SCALE: Record<string, { factor: number; reason: string }> = {
  'beryllium/linear-expansion/a-axis': { factor: 1e-3, reason: BE_PERCENT },
  'beryllium/linear-expansion/c-axis': { factor: 1e-3, reason: BE_PERCENT },
  'beryllium/linear-expansion/polycrystalline': { factor: 1e-3, reason: BE_PERCENT },
}

/** The silicon CTE column is printed against the wrong rows: printed row T → temperature actually evaluated. */
const ROW_TEMPERATURE: Record<string, { map: Record<string, number>; excluded: number[]; reason: string }> = {
  'silicon/expansion-coefficient': {
    map: {
      '2': 1, '3': 2, '4': 3, '6': 4, '8': 6, '10': 8, '12': 10, '14': 12, '16': 14, '18': 16, '20': 18, '30': 20, '40': 30,
      '50': 40, '60': 50, '70': 60, '80': 70, '90': 80, '100': 90, '120': 110, '140': 130, '160': 150, '180': 170,
      '200': 190, '220': 210, '240': 230, '260': 250, '280': 270, '300': 290,
    },
    excluded: [1],
    reason:
      'The silicon CTE column is offset from its temperature column: from 2 K to 100 K each value belongs to the previous row, and from 120 K to 300 K to T − 10 K. The 1 K row (0.000006, the equation at 0.5 K) is excluded.',
  },
}

export type VerificationStatus = 'exact' | 'agrees' | 'differs' | 'not-tabulated'

export interface ModelVerification {
  modelId: string
  /** Column header in the evaluated tables, or null when not tabulated there. */
  bradleyHeader: string | null
  status: VerificationStatus
  page: number | null
  /** Character-column centre of the matched column in the extracted text. */
  x: number | null
  rowsCompared: number
  rowsExact: number
  /** Largest deviation over compared rows: relative to |printed|, or to full scale for linear expansion. */
  maxRelativeDeviation: number | null
  /** Rows below T_low where the tables print the polynomial instead of the page's constant f. */
  polynomialBelowTLowRows: number[]
  notes: string[]
}

function printedHalfUnit(text: string): number {
  const [mantissa, exp] = text.split(/[eE]/)
  const decimals = mantissa!.split('.')[1]?.length ?? 0
  return 0.5 * 10 ** (Number(exp ?? 0) - decimals)
}

const exactMatch = (y: number, text: string) => Math.abs(y - Number(text)) <= printedHalfUnit(text) * (1 + 1e-9) + 1e-12

/** The polynomial a T_low model would give below T_low (the segment above the constant). */
function polynomialBelowTLow(segments: readonly Segment[], T: number): number | undefined {
  const i = segments.findIndex((s) => s.equation.form === 'constant')
  const next = segments[i + 1]
  return i >= 0 && next && T < next.lower.kelvin ? evaluateEquation(next.equation, T) : undefined
}

/**
 * Deviation denominator. Linear-expansion curves cross zero near 293 K, so
 * their deviation is taken relative to the model's full scale (largest |y|
 * over the equation range, i.e. the total contraction); other properties use
 * the printed value.
 */
function deviationScale(model: CryoPropertyModel): (printed: number) => number {
  const factor = PRINTED_SCALE[model.id]?.factor ?? 1
  if (model.property !== 'linear-expansion') return (printed) => Math.max(Math.abs(printed), 1e-30)
  const [lo, hi] = model.equationRangeK
  let full = 0
  for (let i = 0; i <= 200; i++) full = Math.max(full, Math.abs(evaluateSegments(model.segments, lo + ((hi - lo) * i) / 200) ?? 0))
  return () => full * factor
}

interface Comparison {
  compared: number
  exact: number
  maxDev: number
  polyRows: number[]
}

function compareColumn(model: CryoPropertyModel, rows: LayoutRow[], x: number): Comparison {
  const factor = PRINTED_SCALE[model.id]?.factor ?? 1
  const remap = ROW_TEMPERATURE[model.id]
  const dev = deviationScale(model)
  const [lo, hi] = model.equationRangeK
  const within = (target: number, text: string) =>
    exactMatch(target, text) || Math.abs(target - Number(text)) / dev(Number(text)) <= AGREES_RELATIVE
  const out: Comparison = { compared: 0, exact: 0, maxDev: 0, polyRows: [] }
  for (const row of rows) {
    if (remap?.excluded.includes(row.T)) continue
    const T = remap?.map[String(row.T)] ?? row.T
    if (T <= 0 || T < lo || T > hi) continue
    const raw = evaluateSegments(model.segments, T)
    if (raw === undefined) continue
    const y = raw * factor
    const polyRaw = polynomialBelowTLow(model.segments, T)
    const poly = polyRaw === undefined ? undefined : polyRaw * factor
    // Layout positions drift between rows: an agreeing cell within the drift window wins, else the nearest cell within ±6.
    const near = row.cells.filter((c) => Math.abs(c.x - x) <= 25).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))
    const cell =
      near.find((c) => within(y, c.text) || (poly !== undefined && within(poly, c.text))) ?? near.find((c) => Math.abs(c.x - x) <= 6)
    if (!cell) continue
    if (!within(y, cell.text) && poly !== undefined && within(poly, cell.text)) {
      out.polyRows.push(row.T)
      continue
    }
    out.compared++
    if (exactMatch(y, cell.text)) out.exact++
    else out.maxDev = Math.max(out.maxDev, Math.abs(y - Number(cell.text)) / dev(Number(cell.text)))
  }
  return out
}

export function verifyModel(model: CryoPropertyModel, layout: Layout): ModelVerification {
  const factor = PRINTED_SCALE[model.id]?.factor ?? 1
  const remap = ROW_TEMPERATURE[model.id]
  const dev = deviationScale(model)
  const [lo, hi] = model.equationRangeK
  let best: { page: number; x: number; r: Comparison } | null = null
  const score = (r: Comparison) => r.compared - (r.compared - r.exact) * 0.001 - r.maxDev
  for (const page of layout.pages.filter((p) => p.quantity === model.property)) {
    // Candidate positions: cells agreeing with the model within 0.1 % at their row.
    const xs: number[] = []
    for (const row of page.rows) {
      const T = remap?.map[String(row.T)] ?? row.T
      if (T <= 0 || T < lo || T > hi) continue
      const raw = evaluateSegments(model.segments, T)
      if (raw === undefined) continue
      const y = raw * factor
      for (const c of row.cells) if (exactMatch(y, c.text) || Math.abs(y - Number(c.text)) / dev(Number(c.text)) <= AGREES_RELATIVE) xs.push(c.x)
    }
    xs.sort((a, b) => a - b)
    const clusters: number[][] = []
    for (const x of xs) {
      const last = clusters.at(-1)
      if (last && x - last.at(-1)! <= 8) last.push(x)
      else clusters.push([x])
    }
    for (const c of clusters) {
      if (c.length < 3) continue
      const x = Math.round((c.reduce((s, v) => s + v, 0) / c.length) * 2) / 2
      const r = compareColumn(model, page.rows, x)
      if (!best || score(r) > score(best.r)) best = { page: page.page, x, r }
    }
  }

  const notes: string[] = []
  if (PRINTED_SCALE[model.id]) notes.push(PRINTED_SCALE[model.id]!.reason)
  if (remap) notes.push(remap.reason)
  const bradleyHeader = BRADLEY_HEADERS[model.id] ?? null
  if (!best || best.r.compared < 3) {
    if (bradleyHeader) notes.push('The evaluated tables list this column, but none of their columns agrees with the page’s equation within 0.1 %.')
    return {
      modelId: model.id, bradleyHeader, status: bradleyHeader ? 'differs' : 'not-tabulated', page: null, x: null,
      rowsCompared: 0, rowsExact: 0, maxRelativeDeviation: null, polynomialBelowTLowRows: [], notes,
    }
  }
  if (!bradleyHeader) throw new Error(`${model.id} matched a table column but has no BRADLEY_HEADERS entry`)
  const { compared, exact, maxDev, polyRows } = best.r
  if (polyRows.length > 0) {
    notes.push(`Below T_low the tables print the polynomial instead of the page’s constant f (rows ${polyRows.join(', ')} K); this app follows the page.`)
  }
  const status: VerificationStatus = exact === compared ? 'exact' : maxDev <= AGREES_RELATIVE ? 'agrees' : 'differs'
  if (model.property === 'linear-expansion' && status !== 'exact') {
    notes.push('Deviation is relative to the total contraction over the equation range, because the curve crosses zero near 293 K.')
  }
  return {
    modelId: model.id,
    bradleyHeader,
    status,
    page: best.page,
    x: best.x,
    rowsCompared: compared,
    rowsExact: exact,
    maxRelativeDeviation: exact === compared ? 0 : Number(maxDev.toPrecision(3)),
    polynomialBelowTLowRows: polyRows,
    notes,
  }
}

export function verifyDataset(dataset: CryoDataset, layout: Layout) {
  return {
    source: 'P. E. Bradley and R. Radebaugh, Properties of Selected Materials at Cryogenic Temperatures, NIST',
    url: 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059',
    pdfSha256: layout.pdfSha256,
    agreesRelative: AGREES_RELATIVE,
    models: dataset.materials.flatMap((m) => m.models).map((model) => verifyModel(model, layout)),
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataset = JSON.parse(readFileSync('src/data/nist-cryogenic/dataset.json', 'utf8')) as CryoDataset
  const layout = JSON.parse(readFileSync(LAYOUT_PATH, 'utf8')) as Layout
  const result = verifyDataset(dataset, layout)
  const unknown = Object.keys(BRADLEY_HEADERS).filter((id) => !result.models.some((m) => m.modelId === id))
  if (unknown.length > 0) throw new Error(`BRADLEY_HEADERS has ids not in the dataset: ${unknown.join(', ')}`)
  writeFileSync(VERIFICATION_PATH, `${JSON.stringify(result, null, 2)}\n`)
  const counts = result.models.reduce<Record<string, number>>((acc, m) => ((acc[m.status] = (acc[m.status] ?? 0) + 1), acc), {})
  console.log(`Wrote ${VERIFICATION_PATH}:`, counts)
  for (const m of result.models.filter((v) => v.status === 'differs' || v.status === 'agrees')) {
    const devText = m.maxRelativeDeviation === null ? 'no agreeing column' : `max dev ${(m.maxRelativeDeviation * 100).toFixed(3)} %`
    console.log(`  ${m.status.padEnd(7)} ${m.modelId}  p${m.page} rows ${m.rowsExact}/${m.rowsCompared} exact, ${devText}`)
  }
  for (const m of result.models.filter((v) => v.status === 'not-tabulated')) console.log(`  not-tab ${m.modelId}`)
}
