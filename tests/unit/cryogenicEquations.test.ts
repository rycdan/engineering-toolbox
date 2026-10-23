import { describe, expect, it } from 'vitest'
import { erf } from '../../src/engineering/cryogenic/erf'
import { integrate } from '../../src/engineering/cryogenic/integrate'
import { evaluateEquation, evaluateSegments, type Segment } from '../../src/engineering/cryogenic/equations'
import { NIST_6061_T6_EXPANSION as M } from '../../src/data/thermal/nist6061T6'
import { referenceStrain } from '../../src/engineering/thermal/models'

describe('erf', () => {
  // Reference values: CPython math.erf (correctly rounded double precision).
  it.each([
    [0, 0],
    [0.5, 0.5204998778130465],
    [1, 0.8427007929497149],
    [2, 0.9953222650189527],
    [2.6, 0.9997639655834707],
    [3, 0.9999779095030014],
    [-1, -0.8427007929497149],
  ])('erf(%s) = %s', (x, expected) => {
    expect(erf(x)).toBeCloseTo(expected, 14)
  })
  it('is 1 far out and NaN for NaN', () => {
    expect(erf(10)).toBe(1)
    expect(Number.isNaN(erf(Number.NaN))).toBe(true)
  })
})

describe('integrate (composite Gauss–Legendre)', () => {
  it('is exact for polynomials up to degree 9', () => {
    expect(integrate((x) => x ** 9, 0, 2, 5)).toBeCloseTo(2 ** 10 / 10, 9)
  })
  it('reverses sign with reversed limits and is zero for equal limits', () => {
    expect(integrate((x) => x, 3, 1)).toBeCloseTo(-4, 12)
    expect(integrate((x) => x, 2, 2)).toBe(0)
  })
  it('integrating the derivative of the 6061-T6 strain polynomial reproduces the strain difference', () => {
    // dε/dT of the published polynomial, integrated 20 → 293 K, must equal ε(293) − ε(20).
    const [b, c, d] = [-0.30389, 8.7696e-3, -9.9821e-6]
    const slope = (T: number) => (b + 2 * c * T + 3 * d * T * T) * 1e-5
    expect(integrate(slope, 20, 293)).toBeCloseTo(referenceStrain(M, 293) - referenceStrain(M, 20), 14)
  })
})

describe('equation forms', () => {
  it('log10-polynomial', () => {
    expect(evaluateEquation({ form: 'log10-polynomial', coefficients: [1, 2] }, 10)).toBeCloseTo(1000, 9)
  })
  it('tabulated interpolation', () => {
    const eq = { form: 'tabulated' as const, points: [[1, 10], [3, 30]] as [number, number][] }
    expect(evaluateEquation(eq, 2)).toBe(20)
  })
  it('segment bounds are honoured exactly', () => {
    const segs: Segment[] = [
      { lower: { kelvin: 4, inclusive: true }, upper: { kelvin: 10, inclusive: false }, equation: { form: 'constant', value: 1 } },
      { lower: { kelvin: 10, inclusive: true }, upper: { kelvin: 20, inclusive: true }, equation: { form: 'constant', value: 2 } },
    ]
    expect(evaluateSegments(segs, 9.999)).toBe(1)
    expect(evaluateSegments(segs, 10)).toBe(2)
    expect(evaluateSegments(segs, 20)).toBe(2)
    expect(evaluateSegments(segs, 20.001)).toBeUndefined()
    expect(evaluateSegments(segs, 3.999)).toBeUndefined()
    expect(evaluateSegments(segs, Number.NaN)).toBeUndefined()
  })
})
