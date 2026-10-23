import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THERMAL_STATE,
  evaluateThermal,
  paramsToState,
  stateToParams,
  type ThermalFormState,
} from '../../src/features/thermal/thermalState'
import { buildThermalRecord } from '../../src/features/thermal/record'
import { DATASET_VERSION } from '../../src/data/version'
import { THERMAL_CALC_VERSION } from '../../src/engineering/thermal/expansion'

describe('URL state round trip (reproducibility)', () => {
  it('restores every field of a model state', () => {
    const state: ThermalFormState = { ...DEFAULT_THERMAL_STATE, length: '12.5', lengthUnit: 'in', initialT: '68', initialTUnit: 'F', finalT: '4.2', finalTUnit: 'K', outLengthUnit: 'in', changeUnit: 'mil' }
    const { state: restored, warnings } = paramsToState(stateToParams(state))
    expect(warnings).toEqual([])
    expect(restored).toEqual(state)
  })

  it('restores a constant-CTE state', () => {
    const state: ThermalFormState = { ...DEFAULT_THERMAL_STATE, method: 'constant-cte', cte: '13.1', cteUnit: 'ppm_per_F', convention: 'instantaneous-exponential' }
    expect(paramsToState(stateToParams(state)).state).toEqual(state)
  })

  it('records dataset and calculation versions in the link', () => {
    const params = stateToParams(DEFAULT_THERMAL_STATE)
    expect(params.get('dv')).toBe(DATASET_VERSION)
    expect(params.get('cv')).toBe(THERMAL_CALC_VERSION)
  })

  it('warns about unknown units, models, and version mismatches instead of silently accepting them', () => {
    const params = new URLSearchParams('method=model&model=unobtainium&LU=furlong&dv=1999.1.0&cv=thermal-expansion@0.1.0')
    const { state, warnings } = paramsToState(params)
    expect(state.modelId).toBe(DEFAULT_THERMAL_STATE.modelId)
    expect(state.lengthUnit).toBe(DEFAULT_THERMAL_STATE.lengthUnit)
    expect(warnings.join(' ')).toMatch(/unobtainium/)
    expect(warnings.join(' ')).toMatch(/furlong/)
    expect(warnings.join(' ')).toMatch(/1999\.1\.0/)
    expect(warnings.join(' ')).toMatch(/thermal-expansion@0\.1\.0/)
  })

  it('an empty query gives the default example', () => {
    expect(paramsToState(new URLSearchParams()).state).toEqual(DEFAULT_THERMAL_STATE)
  })
})

describe('form evaluation', () => {
  it('default example: 100 mm 6061-T6, 20 °C → 77 K', () => {
    const e = evaluateThermal(DEFAULT_THERMAL_STATE)
    expect(e.ok).toBe(true)
    if (!e.ok) return
    // Same as TE-B3 (1000 mm, 293.15 → 77 K: ΔL = −3.890344851 mm) scaled to 100 mm.
    expect(e.result.changeM * 1000).toBeCloseTo(-0.3890344851, 10)
  })

  it('reports blank and malformed fields by name', () => {
    const e = evaluateThermal({ ...DEFAULT_THERMAL_STATE, length: '', initialT: '20 C' })
    expect(e.ok).toBe(false)
    if (e.ok) return
    expect(e.issues.map((i) => i.field).sort()).toEqual(['initialT', 'length'])
  })

  it('constant-CTE mode requires a CTE (no default value is invented)', () => {
    const e = evaluateThermal({ ...DEFAULT_THERMAL_STATE, method: 'constant-cte' })
    expect(e.ok).toBe(false)
    if (!e.ok) expect(e.issues[0]?.field).toBe('cte')
  })

  it('blocks a model temperature above 300 K (e.g. 30 °C)', () => {
    const e = evaluateThermal({ ...DEFAULT_THERMAL_STATE, initialT: '30' })
    expect(e.ok).toBe(false)
    if (!e.ok) expect(e.issues[0]?.message).toMatch(/outside .* equation range 4–300 K/)
  })
})

describe('calculation record', () => {
  it('contains versions, model identity, inputs, results, limitations, sources, and the reproduce link', () => {
    const e = evaluateThermal(DEFAULT_THERMAL_STATE)
    if (!e.ok) throw new Error('expected ok')
    const text = buildThermalRecord(DEFAULT_THERMAL_STATE, e.resolved, e.result, 'https://example.test/#/thermal?x=1', new Date('2026-10-22T00:00:00Z'))
    for (const fragment of [
      `Calculation version: ${THERMAL_CALC_VERSION}`,
      `Dataset version: ${DATASET_VERSION}`,
      'al-6061-t6/linear-expansion (revision 1)',
      'Initial length: 100 mm',
      'Initial temperature: 20 °C = 293.15 K',
      'Length change: -389.034485',
      'trc.nist.gov',
      'Equation range 4–300 K',
      'Reproduce: https://example.test/#/thermal?x=1',
    ]) {
      expect(text).toContain(fragment)
    }
  })
})
