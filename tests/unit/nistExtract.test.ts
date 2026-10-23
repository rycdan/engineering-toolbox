import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DATASET_PATH,
  REGENERATOR_PATH,
  buildDataset,
  cellText,
  extractRegenerator,
  parseCoefficient,
  parseRange,
  serialize,
  variantOf,
} from '../../tools/nist-cryogenic/extract'
import { MATERIALS } from '../../tools/nist-cryogenic/materials'
import { NIST_6061_T6_COEFFICIENTS as K } from '../../src/data/thermal/nist6061T6'
import type { CryoDataset } from '../../src/data/nist-cryogenic/types'

const committed = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as CryoDataset

describe('NIST dataset is reproducible from the saved snapshots', () => {
  it('committed dataset.json equals a fresh extraction (no hand edits)', () => {
    expect(readFileSync(DATASET_PATH, 'utf8')).toBe(serialize(buildDataset()))
  })
  it('committed regenerator table equals a fresh extraction', () => {
    expect(readFileSync(REGENERATOR_PATH, 'utf8')).toBe(serialize(extractRegenerator()))
  })
  it('covers every link on the NIST index, in order', () => {
    const index = readFileSync('data-sources/nist-cryogenic/2026-10-23/materialproperties.htm', 'latin1')
    const links = [...index.matchAll(/href="\/cryogenics\/materials\/[^"]+"/gi)].length
    expect(committed.materials).toHaveLength(links)
    expect(committed.materials).toHaveLength(MATERIALS.length)
    expect(new Set(committed.materials.map((m) => m.id)).size).toBe(links)
  })
  it('model ids are unique', () => {
    const ids = committed.materials.flatMap((m) => m.models.map((x) => x.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('extraction details', () => {
  it('6061-T6 linear expansion equals the independent hand transcription of 2026-10-22', () => {
    const m = committed.materials.find((x) => x.id === 'al-6061-t6')!.models.find((x) => x.property === 'linear-expansion')!
    expect(m.segments).toEqual([
      { lower: { kelvin: 4, inclusive: true }, upper: { kelvin: K.tLowK, inclusive: false }, equation: { form: 'constant', value: K.f } },
      { lower: { kelvin: K.tLowK, inclusive: true }, upper: { kelvin: 300, inclusive: true }, equation: { form: 'polynomial', coefficients: [K.a, K.b, K.c, K.d, K.e] } },
    ])
    expect(m.scale).toBe(1e-5)
  })

  it('keeps "<" in text that is not a tag, and decodes entities', () => {
    expect(cellText('10 (<em>T</em> < 15K); 5 (<em>T</em> &ge; 15K)')).toBe('10 (T < 15K); 5 (T ≥ 15K)')
    expect(cellText('[(L-L<sub>293</sub>)/L<sub>293</sub>] x 10<sup>5</sup>')).toBe('[(L-L_293)/L_293] x 10^5')
  })

  it('parses published number and range formats', () => {
    const notes = new Set<string>()
    expect(parseCoefficient('8.7335 E-3', notes)).toBe(8.7335e-3)
    expect(notes.size).toBe(1)
    expect(parseCoefficient('-.71218931', notes)).toBe(-0.71218931)
    expect(parseCoefficient('NA', notes)).toBeNull()
    expect(parseCoefficient('---', notes)).toBeNull()
    expect(() => parseCoefficient('1.2.3', notes)).toThrow()
    expect(parseRange('20-500K')).toEqual([20, 500])
    expect(parseRange('13-600 K')).toEqual([13, 600])
    expect(parseRange('0.1-291')).toEqual([0.1, 291])
  })

  it('cleans variant labels', () => {
    expect(variantOf('Thermal Conductivity (Normal Direction)', 'thermal-conductivity')).toBe('Normal Direction')
    expect(variantOf('Linear expansion density: 64.07 kg/m ^3 (=4.0 lb/ft ^3, CO _2 blown)', 'linear-expansion')).toBe(
      'density: 64.07 kg/m³ (=4.0 lb/ft³, CO₂ blown)',
    )
  })

  it('merges columns published over adjacent ranges into piecewise models', () => {
    const ps = committed.materials.find((m) => m.id === 'polystyrene')!.models.find((m) => m.id.startsWith('polystyrene/linear-expansion/density-51.42'))!
    expect(ps.segments.map((s) => [s.equation.form, s.lower.kelvin, s.upper.kelvin, s.upper.inclusive])).toEqual([
      ['constant', 4, 6.4, false],
      ['polynomial', 6.4, 105, false],
      ['polynomial', 105, 278, true],
    ])
  })

  it('uses the special equation forms where the page publishes them', () => {
    const form = (materialId: string, property: string) =>
      committed.materials.find((m) => m.id === materialId)!.models.find((m) => m.property === property)!.segments[0]!.equation.form
    expect(form('copper-ofhc', 'thermal-conductivity')).toBe('nist-copper-k')
    expect(form('kevlar-49-fiber', 'thermal-conductivity')).toBe('nist-kevlar-k')
    expect(form('silicon', 'expansion-coefficient')).toBe('nist-silicon-cte')
    expect(form('copper-ofhc', 'expansion-coefficient')).toBe('log10-polynomial')
  })

  it('regenerator table keeps blank cells as null, never zero', () => {
    const r = extractRegenerator()
    expect(r.materials).toHaveLength(30)
    expect(r.rows).toHaveLength(501)
    expect(r.rows.every((row) => row.length === 31)).toBe(true)
    expect(r.rows.flat().some((v) => v === null)).toBe(true)
  })
})
