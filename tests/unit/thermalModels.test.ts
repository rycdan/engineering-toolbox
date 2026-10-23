import { describe, expect, it } from 'vitest'
import { MATERIALS_WITHOUT_EXPANSION, THERMAL_MODELS, findThermalModel } from '../../src/data/thermal'
import { computeThermalLengthChange, sampleLengthCurve } from '../../src/engineering/thermal/expansion'
import { referenceStrain } from '../../src/engineering/thermal/models'
import { getSource } from '../../src/data/sources'
import { cryoVerification } from '../../src/data/nist-cryogenic'

describe('thermal model registry (NIST dataset)', () => {
  it('includes every NIST linear-expansion curve plus integrated-CTE models for copper and silicon', () => {
    const reference = THERMAL_MODELS.filter((m) => m.kind === 'reference-strain')
    const integrated = THERMAL_MODELS.filter((m) => m.kind === 'integrated-cte').map((m) => m.id)
    expect(reference).toHaveLength(36)
    expect(integrated.sort()).toEqual(['copper-ofhc/expansion-coefficient', 'silicon/expansion-coefficient'])
  })

  it('lists the NIST materials that have no expansion model', () => {
    expect(MATERIALS_WITHOUT_EXPANSION.map((m) => m.name)).toContain('Aluminum 1100')
    expect(MATERIALS_WITHOUT_EXPANSION.map((m) => m.name)).toContain('Regenerator materials')
  })

  it('model ids are unique and every source id resolves', () => {
    expect(new Set(THERMAL_MODELS.map((m) => m.id)).size).toBe(THERMAL_MODELS.length)
    for (const m of THERMAL_MODELS) for (const s of m.sourceIds) expect(() => getSource(s)).not.toThrow()
  })

  it('every model matches NIST’s evaluated tables (exact or ≤ 0.1 %), or is not tabulated there', () => {
    for (const model of THERMAL_MODELS) {
      const v = cryoVerification(model.id)!
      expect([model.id, ['exact', 'agrees', 'not-tabulated'].includes(v.status)]).toEqual([model.id, true])
      if (v.status === 'agrees') expect(v.maxRelativeDeviation!).toBeLessThanOrEqual(0.001)
    }
  })

  it('renders fit-error exponents for display', () => {
    expect(findThermalModel('silicon/expansion-coefficient')!.fitErrorText).toBe('0.03×10⁻⁸ (T < 50K); 0.5×10⁻⁸ (T ≥ 50K)')
  })

  it('resolves the pre-dataset 6061 id used in older links', () => {
    expect(findThermalModel('nist-6061-t6-linear-expansion')?.id).toBe('al-6061-t6/linear-expansion')
  })

  it.each(THERMAL_MODELS.map((m) => [m.id, m] as const))('%s: finite strain across its range, plausible magnitude, plot works', (_id, model) => {
    const [lo, hi] = model.equationRangeK
    const start = Math.max(lo, 1)
    for (let i = 0; i <= 50; i++) {
      const T = start + ((hi - start) * i) / 50
      const e = referenceStrain(model, T)
      expect(Number.isFinite(e)).toBe(true)
      expect(Math.abs(e)).toBeLessThan(0.03)
    }
    const r = computeThermalLengthChange({ initialLengthM: 1, initialK: hi, finalK: start }, { kind: 'model', model })
    expect(r.ok).toBe(true)
    const curve = sampleLengthCurve({ initialLengthM: 1, initialK: hi, finalK: start }, { kind: 'model', model }, 60)
    expect(curve.every((p) => Number.isFinite(p.lengthM))).toBe(true)
  })

  it('integrated-CTE plot sampling agrees with direct integration', () => {
    const si = findThermalModel('silicon/expansion-coefficient')!
    const pts = sampleLengthCurve({ initialLengthM: 1, initialK: 293, finalK: 77 }, { kind: 'model', model: si }, 120)
    for (const p of pts.filter((_, i) => i % 20 === 0)) {
      expect(p.lengthM).toBeCloseTo((1 + referenceStrain(si, p.kelvin)) / (1 + referenceStrain(si, 293)), 12)
    }
  })

  it('warns when an interval leaves the measured-data range but stays in the equation range', () => {
    const si = findThermalModel('silicon/expansion-coefficient')!
    const r = computeThermalLengthChange({ initialLengthM: 1, initialK: 293, finalK: 5 }, { kind: 'model', model: si })
    expect(r.ok && r.value.notes.some((n) => n.text.includes('outside the measured data'))).toBe(true)
  })

  it('calls out the Invar 80 K breakpoint jump (2.1×10⁻⁶ strain)', () => {
    const invar = findThermalModel('invar-36/linear-expansion')!
    expect(invar.breakpoints[0]!.jumpStrain).toBeCloseTo(2.1e-6, 7)
    expect(invar.limitations.some((l) => l.includes('At 80 K'))).toBe(true)
  })
})
