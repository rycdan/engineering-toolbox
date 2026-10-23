import { describe, expect, it } from 'vitest'
import { computeThermalLengthChange } from '../../src/engineering/thermal/expansion'
import { referenceStrain } from '../../src/engineering/thermal/models'
import { NIST_6061_T6_EXPANSION as M } from '../../src/data/thermal/nist6061T6'
import bradley from './data/nist-bradley-radebaugh-6061.json'
import mono29 from './data/nbs-monograph-29-aluminum.json'
import exact from './data/exact-rational-6061.json'

const bradleyPoints = bradley.points as [string, string][]
const mono29Points = mono29.points as [number, number][]

/** y = ε × 10⁵ as published by NIST. */
const y = (T: number) => referenceStrain(M, T) / M.scale

describe('TE-B1: NIST-published evaluated table (Bradley & Radebaugh), Al 6061 column', () => {
  // Half a unit in the last printed digit, plus a 0.001 (×10⁻⁵) allowance for the
  // table's own evaluation: at 180 K NIST prints −241.5 where the published
  // coefficients give −241.5508 (see bradley.note and docs/DATA_SOURCES.md).
  const sourceEvaluationAllowance = 0.001
  it.each(bradleyPoints)('%s K → %s ×10⁻⁵', (tText, yText) => {
    const decimals = yText.split('.')[1]?.length ?? 0
    const halfUnit = 0.5 * 10 ** -decimals
    expect(Math.abs(y(Number(tText)) - Number(yText))).toBeLessThanOrEqual(halfUnit + sourceEvaluationAllowance)
  })

  it('every point except 180 K rounds exactly to the printed value', () => {
    const misrounded = bradleyPoints.filter(([tText, yText]) => {
      const decimals = yText.split('.')[1]?.length ?? 0
      return y(Number(tText)).toFixed(decimals) !== Number(yText).toFixed(decimals)
    })
    expect(misrounded.map(([t]) => t)).toEqual(['180'])
  })
})

describe('TE-B2: measured aluminum contraction, NBS Monograph 29 Table 2.1 (material-proxy check)', () => {
  // Model contraction relative to 293 K, in the source's sign convention:
  // c = (L293 − LT)/L293 = 1 − (1 + ε(T)) / (1 + ε(293))
  const contraction = (T: number) => (1 - (1 + referenceStrain(M, T)) / (1 + referenceStrain(M, 293))) * 1e5

  it.each(mono29Points)('%s K: measured %s ×10⁻⁵', (T, measured) => {
    const tolerance = 0.04 * Math.abs(measured) + 0.5
    expect(Math.abs(contraction(T) - measured)).toBeLessThanOrEqual(tolerance)
  })

  it('total contraction 293 → 20 K matches measured 0.415 % within 1 %', () => {
    expect(contraction(20) / 415).toBeCloseTo(1, 2)
  })
})

describe('TE-B3: exact-rational independent re-implementation', () => {
  const Li = exact.initialLength_mm / 1000
  it.each(exact.cases)('$Ti_K K → $Tf_K K', ({ Ti_K, Tf_K, Lf_mm, dL_mm }) => {
    const out = computeThermalLengthChange({ initialLengthM: Li, initialK: Ti_K, finalK: Tf_K }, { kind: 'model', model: M })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(Math.abs(out.value.finalLengthM * 1000 - Lf_mm)).toBeLessThan(2e-9)
    expect(Math.abs(out.value.changeM * 1000 - dL_mm)).toBeLessThan(2e-9)
  })
})

describe('Room-temperature slope plausibility', () => {
  it('dε/dT at 293 K (22.64×10⁻⁶/K) is within 4 % of measured pure-Al 23.0×10⁻⁶/K (Monograph 29)', () => {
    const h = 0.5
    const slope = (referenceStrain(M, 293 + h) - referenceStrain(M, 293 - h)) / (2 * h)
    expect(slope).toBeCloseTo(22.642e-6, 8)
    expect(Math.abs(slope / 23.0e-6 - 1)).toBeLessThan(0.04)
  })
})
