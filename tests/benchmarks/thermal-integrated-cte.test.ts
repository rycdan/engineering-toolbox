import { describe, expect, it } from 'vitest'
import { findThermalModel } from '../../src/data/thermal'
import { referenceStrain } from '../../src/engineering/thermal/models'

/**
 * TE-B6: materials for which NIST publishes only a CTE curve. The integrated
 * strain is compared with measured contraction from NBS Monograph 29
 * (Corruccini & Gniewek 1961), Table 2.1, 10⁵·(L293 − LT)/L293. Values were
 * transcribed from the PDF text layer (visual check pending, Q-004);
 * Grüneisen-estimated values (marked "a") are excluded.
 */
const contraction = (id: string, T: number) => -referenceStrain(findThermalModel(id)!, T) * 1e5

describe('OFHC copper: integrated NIST CTE vs measured contraction', () => {
  const measured: [number, number][] = [
    [20, 326], [30, 325], [40, 324], [50, 321], [60, 316], [70, 310], [80, 302], [90, 293], [100, 283], [120, 260],
    [140, 235], [160, 208], [180, 179], [200, 149], [220, 118], [240, 87], [260, 55], [273, 33], [280, 22], [293, 0], [300, -11],
  ]
  // Within 1×10⁻⁵ strain (≈0.3 % of the 326×10⁻⁵ total contraction; table resolution 1×10⁻⁵).
  it.each(measured)('%s K: measured %s ×10⁻⁵', (T, v) => {
    expect(Math.abs(contraction('copper-ofhc/expansion-coefficient', T) - v)).toBeLessThanOrEqual(1)
  })
})

describe('Silicon: integrated NIST CTE vs measured contraction', () => {
  const measured: [number, number][] = [
    [40, 21.6], [50, 21.7], [60, 22.0], [70, 22.5], [80, 23.2], [90, 24.0], [100, 24.3], [120, 24.7], [140, 24.3], [160, 23.4],
    [180, 21.7], [200, 19.1], [220, 15.9], [240, 11.8], [260, 7.8], [273, 4.8], [280, 3.3], [293, 0], [300, -1.4],
  ]
  // Within 0.5×10⁻⁵ strain; silicon's contraction peaks near 120 K because its CTE is negative below ~120 K.
  it.each(measured)('%s K: measured %s ×10⁻⁵', (T, v) => {
    expect(Math.abs(contraction('silicon/expansion-coefficient', T) - v)).toBeLessThanOrEqual(0.5)
  })
  it('reproduces the non-monotonic contraction (maximum between 100 and 140 K)', () => {
    const c = (T: number) => contraction('silicon/expansion-coefficient', T)
    expect(c(120)).toBeGreaterThan(c(60))
    expect(c(120)).toBeGreaterThan(c(200))
  })
})
