import type { ReferenceStrainModel } from '../../engineering/thermal/models'
import { findThermalModel } from './index'

/**
 * NIST 6061-T6 linear-expansion coefficients as transcribed by hand on
 * 2026-10-22 from
 * https://trc.nist.gov/cryogenics/materials/6061%20Aluminum/6061_T6Aluminum_rev.htm
 *
 *   y = (L − L293)/L293 × 10⁵
 *   y = a + bT + cT² + dT³ + eT⁴   for T > T_low
 *   y = f                          for T < T_low
 *
 * Kept as an independent cross-check: tests assert the generated dataset
 * model (tools/nist-cryogenic/extract.ts) carries exactly these values.
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

/** The calculator's 6061-T6 model (generated from the NIST dataset). */
export const NIST_6061_T6_EXPANSION = findThermalModel('al-6061-t6/linear-expansion') as ReferenceStrainModel
