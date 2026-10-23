import { describe, expect, it } from 'vitest'
import { computeThermalLengthChange, type ConstantCteConvention } from '../../src/engineering/thermal/expansion'
import { cteToPerKelvin, lengthToMeters, metersToLength, temperatureToKelvin } from '../../src/engineering/units'

/**
 * TE-B4: hand-worked constant-CTE cases. Each expected value was worked out by
 * hand (arithmetic shown) rather than produced by the app.
 */
function run(L: number, Lu: 'm' | 'mm' | 'in', a: number, au: 'ppm_per_K' | 'ppm_per_F', Ti: number, Tf: number, Tu: 'C' | 'F', conv: ConstantCteConvention = 'mean-linear') {
  const out = computeThermalLengthChange(
    { initialLengthM: lengthToMeters(L, Lu), initialK: temperatureToKelvin(Ti, Tu), finalK: temperatureToKelvin(Tf, Tu) },
    { kind: 'constant-cte', alphaPerK: cteToPerKelvin(a, au), convention: conv },
  )
  if (!out.ok) throw new Error('unexpected failure')
  return out.value
}

describe('TE-B4: hand-worked constant-CTE cases', () => {
  it('steel 2.000 m, 11.7×10⁻⁶/K, 20 → 70 °C: ΔL = 2.000·11.7e-6·50 = 1.170 mm', () => {
    const r = run(2, 'm', 11.7, 'ppm_per_K', 20, 70, 'C')
    expect(metersToLength(r.changeM, 'mm')).toBeCloseTo(1.17, 12)
    expect(metersToLength(r.finalLengthM, 'mm')).toBeCloseTo(2001.17, 9)
  })

  it('aluminum 10.000 in, 13.1×10⁻⁶/°F, 68 → 32 °F: ΔL = 10·13.1e-6·(−36) = −0.004716 in', () => {
    const r = run(10, 'in', 13.1, 'ppm_per_F', 68, 32, 'F')
    expect(metersToLength(r.changeM, 'in')).toBeCloseTo(-0.004716, 12)
    expect(metersToLength(r.finalLengthM, 'in')).toBeCloseTo(9.995284, 10)
  })

  it('same part in SI: 254 mm, 23.58×10⁻⁶/K, 20 → 0 °C: ΔL = 254·23.58e-6·(−20) = −0.1197864 mm = −0.004716 in', () => {
    const r = run(254, 'mm', 23.58, 'ppm_per_K', 20, 0, 'C')
    expect(metersToLength(r.changeM, 'mm')).toBeCloseTo(-0.1197864, 12)
    expect(metersToLength(r.changeM, 'in')).toBeCloseTo(-0.004716, 12)
  })

  it('instantaneous convention: 1 m, 20×10⁻⁶/K, ΔT = +100 K: Lf = e^0.002 = 1.002002001334 m', () => {
    // e^x = 1 + x + x²/2 + x³/6 + … = 1 + 0.002 + 0.000002 + 1.3333e-9 + 6.7e-13
    const r = run(1, 'm', 20, 'ppm_per_K', 0, 100, 'C', 'instantaneous-exponential')
    expect(r.finalLengthM).toBeCloseTo(1.002002001334, 12)
    const linear = run(1, 'm', 20, 'ppm_per_K', 0, 100, 'C')
    expect(linear.finalLengthM).toBeCloseTo(1.002, 15)
    // Difference ≈ Li·(αΔT)²/2 = 2e-6 m
    expect(r.finalLengthM - linear.finalLengthM).toBeCloseTo(2.0013e-6, 9)
  })

  it('mean CTE output reproduces the input CTE for the linear convention', () => {
    const r = run(1, 'm', 11.7, 'ppm_per_K', 20, 70, 'C')
    expect(r.meanCtePerK).toBeCloseTo(11.7e-6, 18)
  })
})
