import type { ReferenceStrainModel } from '../../engineering/thermal/models'

/**
 * NIST 6061-T6 aluminum linear expansion, transcribed 2026-10-22 from
 * https://trc.nist.gov/cryogenics/materials/6061%20Aluminum/6061_T6Aluminum_rev.htm
 *
 *   y = (L − L293)/L293 × 10⁵
 *   y = a + bT + cT² + dT³ + eT⁴   for T > T_low
 *   y = f                          for T < T_low
 *
 * Do not edit coefficients without updating docs/DATA_SOURCES.md, bumping the
 * model revision and DATASET_VERSION, and re-running the benchmarks.
 */
export const NIST_6061_T6_COEFFICIENTS = {
  a: -4.1277e2,
  b: -3.0389e-1,
  c: 8.7696e-3,
  d: -9.9821e-6,
  e: 0,
  tLowK: 18,
  f: -415.45,
} as const

const k = NIST_6061_T6_COEFFICIENTS

export const NIST_6061_T6_EXPANSION: ReferenceStrainModel = {
  kind: 'reference-strain',
  id: 'nist-6061-t6-linear-expansion',
  revision: 1,
  materialId: 'al-6061-t6',
  label: 'Aluminum 6061-T6 (NIST)',
  quantity: '(L − L293)/L293',
  referenceTemperatureK: 293,
  scale: 1e-5,
  equationText: 'y = a + bT + cT² + dT³ + eT⁴ for T > T_low;  y = f for T < T_low;  y = (L − L293)/L293 × 10⁵, T in K',
  segments: [
    {
      kind: 'constant',
      lower: { kelvin: 4, inclusive: true },
      upper: { kelvin: k.tLowK, inclusive: false },
      value: k.f,
    },
    {
      kind: 'polynomial',
      lower: { kelvin: k.tLowK, inclusive: true },
      upper: { kelvin: 300, inclusive: true },
      coefficients: [k.a, k.b, k.c, k.d, k.e],
    },
  ],
  breakpoints: [
    {
      kelvin: k.tLowK,
      owner: 'upper',
      sourceWording: 'y = polynomial for T > T_low; y = f for T < T_low (T = T_low not assigned)',
      maxJumpStrain: 1e-7,
      rationale:
        'Polynomial gives −415.4569 at 18 K vs f = −415.45: a jump of 6.9×10⁻⁸ strain, below the source coefficient resolution and the NIST evaluated table (−415.5).',
    },
  ],
  equationRangeK: [4, 300],
  dataRangeK: [4, 300],
  fitErrorPercent: 4,
  fitErrorBasis:
    'Curve-fit error relative to data, as stated by NIST. This is not total material uncertainty: experimental uncertainty (2–5 %) and sample-to-sample variation apply in addition.',
  sourceIds: ['nist-6061-t6', 'nist-bradley-radebaugh'],
  limitations: [
    'Equation range 4–300 K (300 K = 26.85 °C = 80.33 °F). Temperatures outside it are blocked.',
    'NIST fit error is 4 % relative to data. Sample-to-sample variation and measurement uncertainty are additional.',
    'Product form and direction are not specified by the source.',
  ],
}
