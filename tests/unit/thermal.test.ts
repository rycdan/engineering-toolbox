import { describe, expect, it } from 'vitest'
import { computeThermalLengthChange, sampleLengthCurve, type ThermalMethod } from '../../src/engineering/thermal/expansion'
import { evaluatePolynomial, evaluateSegment, isInEquationRange, referenceStrain } from '../../src/engineering/thermal/models'
import { NIST_6061_T6_EXPANSION as M } from '../../src/data/thermal/nist6061T6'
import { lengthToMeters, metersToLength, temperatureToKelvin } from '../../src/engineering/units'

const model: ThermalMethod = { kind: 'model', model: M }
const cte = (alphaPerK: number, convention: 'mean-linear' | 'instantaneous-exponential' = 'mean-linear'): ThermalMethod => ({
  kind: 'constant-cte',
  alphaPerK,
  convention,
})

function run(Li: number, Ti: number, Tf: number, method: ThermalMethod) {
  const out = computeThermalLengthChange({ initialLengthM: Li, initialK: Ti, finalK: Tf }, method)
  if (!out.ok) throw new Error(out.issues.map((i) => i.message).join('; '))
  return out.value
}

describe('TE-P: physical and algebraic invariants', () => {
  it.each([model, cte(23e-6), cte(23e-6, 'instantaneous-exponential')])('zero temperature change gives zero change (%#)', (method) => {
    for (const T of [4, 18, 77, 293, 300]) {
      const r = run(1, T, T, method)
      expect(r.changeM).toBe(0)
      expect(r.finalLengthM).toBe(1)
      expect(r.meanCtePerK).toBeNull()
    }
  })

  it.each([model, cte(23e-6), cte(23e-6, 'instantaneous-exponential')])('cooling shortens, heating lengthens (%#)', (method) => {
    expect(run(1, 293.15, 77, method).changeM).toBeLessThan(0)
    expect(run(1, 77, 293.15, method).changeM).toBeGreaterThan(0)
  })

  it.each([model, cte(23e-6, 'instantaneous-exponential')])('round trip Ti→Tf→Ti returns the initial length (%#)', (method) => {
    const Li = 0.1234
    const there = run(Li, 293.15, 20, method)
    const back = run(there.finalLengthM, 20, 293.15, method)
    expect(back.finalLengthM).toBeCloseTo(Li, 15)
  })

  it('model result is independent of the path through an intermediate temperature', () => {
    const direct = run(1, 295, 10, model)
    const step = run(run(1, 295, 120, model).finalLengthM, 120, 10, model)
    expect(step.finalLengthM).toBeCloseTo(direct.finalLengthM, 15)
  })

  it('length change scales linearly with initial length', () => {
    const a = run(0.1, 293.15, 77, model)
    const b = run(1, 293.15, 77, model)
    expect(b.changeM / a.changeM).toBeCloseTo(10, 12)
    expect(b.strain).toBeCloseTo(a.strain, 15)
  })

  it('unit equivalence: same physical inputs in mm/K, in/°F, m/°C, ft/°R agree', () => {
    const cases = [
      { L: 100, Lu: 'mm', Ti: 20, Tu: 'C', Tf: 77, Tfu: 'K' },
      { L: 100 / 25.4, Lu: 'in', Ti: 68, Tu: 'F', Tf: -321.07, Tfu: 'F' },
      { L: 0.1, Lu: 'm', Ti: 293.15, Tu: 'K', Tf: -196.15, Tfu: 'C' },
      { L: 0.1 / 0.3048, Lu: 'ft', Ti: 527.67, Tu: 'R', Tf: 138.6, Tfu: 'R' },
    ] as const
    const results = cases.map((c) =>
      run(lengthToMeters(c.L, c.Lu), temperatureToKelvin(c.Ti, c.Tu), temperatureToKelvin(c.Tf, c.Tfu), model),
    )
    for (const r of results) {
      expect(metersToLength(r.changeM, 'mm')).toBeCloseTo(metersToLength(results[0]!.changeM, 'mm'), 9)
    }
  })

  it('model strain relative to the reference is near zero at 293 K (fit residual, removed by the ratio method)', () => {
    expect(Math.abs(referenceStrain(M, 293))).toBeLessThan(1e-6)
    // The ratio method makes the result independent of that residual:
    const r = run(1, 293, 77, model)
    const naive = referenceStrain(M, 77) // would assume ε(293) = 0
    expect(Math.abs(r.strain - naive)).toBeGreaterThan(0)
    expect(Math.abs(r.strain - naive)).toBeLessThan(1e-6)
  })
})

describe('TE-BP: NIST 6061-T6 piecewise breakpoint', () => {
  const bp = M.breakpoints[0]!
  it('documented jump at 18 K is within the stated bound', () => {
    const [low, high] = M.segments
    const jump = Math.abs(evaluateSegment(high!, bp.kelvin) - evaluateSegment(low!, bp.kelvin)) * M.scale
    expect(jump).toBeLessThan(bp.maxJumpStrain)
    expect(jump).toBeGreaterThan(6e-8) // confirms the real (non-zero) discontinuity is what was documented
  })
  it('T = 18 K is owned by the polynomial; just below uses f', () => {
    expect(referenceStrain(M, 18)).toBeCloseTo(evaluatePolynomial([-412.77, -0.30389, 8.7696e-3, -9.9821e-6, 0], 18) * 1e-5, 15)
    expect(referenceStrain(M, 17.999)).toBe(-415.45e-5)
    expect(referenceStrain(M, 4)).toBe(-415.45e-5)
  })
  it('length is constant from 4 K to just below 18 K', () => {
    expect(run(1, 4, 17.9, model).changeM).toBe(0)
  })
  it('emits a note when the interval goes below 18 K', () => {
    expect(run(1, 293, 10, model).notes.some((n) => n.text.includes('18 K'))).toBe(true)
    expect(run(1, 293, 77, model).notes.some((n) => n.text.includes('18 K'))).toBe(false)
  })
})

describe('TE-F: failure cases are rejected', () => {
  const base = { initialLengthM: 1, initialK: 293, finalK: 77 }
  it.each([
    ['NaN length', { ...base, initialLengthM: Number.NaN }, 'length'],
    ['infinite length', { ...base, initialLengthM: Number.POSITIVE_INFINITY }, 'length'],
    ['zero length', { ...base, initialLengthM: 0 }, 'length'],
    ['negative length', { ...base, initialLengthM: -1 }, 'length'],
    ['0 K initial', { ...base, initialK: 0 }, 'initialT'],
    ['negative K final', { ...base, finalK: -5 }, 'finalT'],
    ['NaN final', { ...base, finalK: Number.NaN }, 'finalT'],
  ])('%s', (_name, input, field) => {
    for (const method of [model, cte(23e-6)]) {
      const out = computeThermalLengthChange(input, method)
      expect(out.ok).toBe(false)
      if (!out.ok) expect(out.issues.map((i) => i.field)).toContain(field)
    }
  })

  it.each([3.999, 300.001, 373.15, 1])('model blocks %s K (outside 4–300 K)', (T) => {
    const out = computeThermalLengthChange({ ...base, finalK: T }, model)
    expect(out.ok).toBe(false)
    expect(isInEquationRange(M, T)).toBe(false)
  })

  it.each([4, 300])('model accepts the range endpoint %s K', (T) => {
    expect(computeThermalLengthChange({ ...base, finalK: T }, model).ok).toBe(true)
  })

  it('constant CTE accepts temperatures outside the model range', () => {
    expect(computeThermalLengthChange({ ...base, finalK: 500 }, cte(23e-6)).ok).toBe(true)
  })

  it('rejects non-finite CTE and non-physical final length', () => {
    expect(computeThermalLengthChange(base, cte(Number.NaN)).ok).toBe(false)
    expect(computeThermalLengthChange(base, cte(0.01)).ok).toBe(false) // 1 + 0.01·(−216) < 0
  })

  it('referenceStrain throws outside the equation range', () => {
    expect(() => referenceStrain(M, 301)).toThrow(RangeError)
  })
})

describe('notes and plot sampling', () => {
  it('constant CTE warns at cryogenic temperatures only', () => {
    expect(run(1, 293, 77, cte(23e-6)).notes.some((n) => n.severity === 'warning')).toBe(true)
    expect(run(1, 293, 350, cte(23e-6)).notes.some((n) => n.severity === 'warning')).toBe(false)
  })
  it('model curve spans the equation range and passes through Li at Ti', () => {
    const pts = sampleLengthCurve({ initialLengthM: 1, initialK: 293, finalK: 77 }, model, 296)
    expect(pts[0]!.kelvin).toBe(4)
    expect(pts.at(-1)!.kelvin).toBe(300)
    const at293 = pts.find((p) => Math.abs(p.kelvin - 293) < 1e-9)!
    expect(at293.lengthM).toBeCloseTo(1, 15)
  })
})
