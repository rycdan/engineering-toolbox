import { fail, ok, type Issue, type Outcome } from '../outcome'
import { integrate } from '../cryogenic/integrate'
import { cteAt, isInEquationRange, referenceStrain, type IntegratedCteModel, type ThermalExpansionModel } from './models'

/**
 * Calculation version. Bump when the method or numerical behavior changes so
 * saved records identify the algorithm that produced them.
 */
export const THERMAL_CALC_VERSION = 'thermal-expansion@1.1.0'

/**
 * Constant-CTE conventions (docs/ENGINEERING_METHODS.md, Method B):
 * - mean-linear: Lf = Li·(1 + α·ΔT), α a mean coefficient referenced to Li
 * - instantaneous-exponential: α = (1/L)·dL/dT constant ⇒ Lf = Li·exp(α·ΔT)
 */
export type ConstantCteConvention = 'mean-linear' | 'instantaneous-exponential'

export type ThermalMethod =
  | { kind: 'model'; model: ThermalExpansionModel }
  | { kind: 'constant-cte'; alphaPerK: number; convention: ConstantCteConvention }

/** Canonical inputs: meters and kelvin. */
export interface ThermalInputs {
  initialLengthM: number
  initialK: number
  finalK: number
}

export interface ThermalNote {
  severity: 'info' | 'warning'
  text: string
}

export interface ThermalResult {
  finalLengthM: number
  /** Signed: negative = contraction. */
  changeM: number
  /** ΔL / Li */
  strain: number
  deltaTK: number
  /** ΔL / (Li·ΔT); null when ΔT = 0. Informational only. */
  meanCtePerK: number | null
  /** Model only: ε(Ti), ε(Tf) relative to the model reference temperature. */
  strainInitialRef: number | null
  strainFinalRef: number | null
  notes: ThermalNote[]
}

/** Below this temperature a constant room-temperature CTE is flagged as a poor estimate. */
export const CONSTANT_CTE_CRYOGENIC_WARNING_K = 200

export function validateThermalInputs(input: ThermalInputs, method: ThermalMethod): Issue[] {
  const issues: Issue[] = []
  if (!Number.isFinite(input.initialLengthM)) {
    issues.push({ field: 'length', message: 'Initial length must be a finite number.' })
  } else if (input.initialLengthM <= 0) {
    issues.push({ field: 'length', message: 'Initial length must be greater than zero.' })
  }
  const temps: [keyof ThermalInputs, string, string][] = [
    ['initialK', 'initialT', 'Initial temperature'],
    ['finalK', 'finalT', 'Final temperature'],
  ]
  for (const [key, field, label] of temps) {
    const T = input[key]
    if (!Number.isFinite(T)) {
      issues.push({ field, message: `${label} must be a finite number.` })
    } else if (T <= 0) {
      issues.push({ field, message: `${label} must be above absolute zero (0 K).` })
    } else if (method.kind === 'model' && !isInEquationRange(method.model, T)) {
      const [lo, hi] = method.model.equationRangeK
      issues.push({
        field,
        message: `${label} (${T.toFixed(2)} K) is outside the ${method.model.label} equation range ${lo}–${hi} K. Extrapolation is blocked.`,
      })
    }
  }
  if (method.kind === 'constant-cte' && !Number.isFinite(method.alphaPerK)) {
    issues.push({ field: 'cte', message: 'CTE must be a finite number.' })
  }
  return issues
}

/**
 * Length change between two temperatures.
 *
 * Model (reference strain):  Lf = Li·(1+ε(Tf))/(1+ε(Ti)),
 *                            ΔL = Li·(ε(Tf)−ε(Ti))/(1+ε(Ti))   (computed directly to avoid cancellation)
 * Constant CTE:              see ConstantCteConvention.
 */
export function computeThermalLengthChange(input: ThermalInputs, method: ThermalMethod): Outcome<ThermalResult> {
  const issues = validateThermalInputs(input, method)
  if (issues.length > 0) return fail(issues)

  const { initialLengthM: Li, initialK: Ti, finalK: Tf } = input
  const deltaTK = Tf - Ti
  const notes: ThermalNote[] = []
  let changeM: number
  let strainInitialRef: number | null = null
  let strainFinalRef: number | null = null

  if (method.kind === 'model') {
    const { model } = method
    const ei = referenceStrain(model, Ti)
    const ef = referenceStrain(model, Tf)
    strainInitialRef = ei
    strainFinalRef = ef
    changeM = (Li * (ef - ei)) / (1 + ei)
    notes.push(...modelNotes(model, Ti, Tf))
  } else {
    const { alphaPerK, convention } = method
    const x = alphaPerK * deltaTK
    changeM = convention === 'mean-linear' ? Li * x : Li * Math.expm1(x)
    notes.push({
      severity: 'info',
      text: 'Constant-CTE estimate: the coefficient is user supplied and assumed constant over the whole interval. Its accuracy depends on the CTE value matching this temperature interval.',
    })
    if (Math.min(Ti, Tf) < CONSTANT_CTE_CRYOGENIC_WARNING_K) {
      notes.push({
        severity: 'warning',
        text: 'This interval reaches cryogenic temperatures. CTE falls sharply on cooling, so a room-temperature CTE overestimates contraction. Example: 6061-T6 at 22.6×10⁻⁶/K over 293→4 K predicts about 0.65 %, versus 0.415 % from the NIST model. Use a temperature-dependent model where one is available.',
      })
    }
  }

  const finalLengthM = Li + changeM
  if (!(finalLengthM > 0) || !Number.isFinite(finalLengthM)) {
    return fail([{ field: 'cte', message: 'The inputs give a non-physical final length. Check the CTE value and units.' }])
  }

  return ok({
    finalLengthM,
    changeM,
    strain: changeM / Li,
    deltaTK,
    meanCtePerK: deltaTK === 0 ? null : changeM / (Li * deltaTK),
    strainInitialRef,
    strainFinalRef,
    notes,
  })
}

/** Interval-specific notes for a temperature-dependent model. */
function modelNotes(model: ThermalExpansionModel, Ti: number, Tf: number): ThermalNote[] {
  const notes: ThermalNote[] = []
  const tMin = Math.min(Ti, Tf)
  const tMax = Math.max(Ti, Tf)
  const first = model.segments[0]
  if (first?.equation.form === 'constant' && tMin < first.upper.kelvin) {
    notes.push({
      severity: 'info',
      text: `Below ${first.upper.kelvin} K this model uses the source's constant value, so the length is treated as unchanged between ${model.equationRangeK[0]} K and ${first.upper.kelvin} K.`,
    })
  }
  if (model.dataRangeK && (tMin < model.dataRangeK[0] || tMax > model.dataRangeK[1])) {
    notes.push({
      severity: 'warning',
      text: `Part of this interval lies outside the measured data (${model.dataRangeK[0]}–${model.dataRangeK[1]} K). It is inside the source's stated equation range (${model.equationRangeK[0]}–${model.equationRangeK[1]} K), but there the result rests on the fit alone.`,
    })
  }
  if (model.kind === 'integrated-cte') {
    notes.push({
      severity: 'info',
      text: 'Length change is computed by integrating the source’s CTE curve, taking α as referenced to the 293 K length. Treating α as instantaneous instead changes the strain by about ε²/2, which is small compared with the stated fit error.',
    })
  }
  return notes
}

export interface CurvePoint {
  kelvin: number
  lengthM: number
}

/**
 * Sample L(T) for plotting the part's length over temperature.
 * Model: across its equation range. Constant CTE: across the input interval
 * padded by 10 % on each side (clamped above 0 K).
 */
export function sampleLengthCurve(input: ThermalInputs, method: ThermalMethod, samples = 240): CurvePoint[] {
  const { initialLengthM: Li, initialK: Ti } = input
  let lo: number
  let hi: number
  let lengthAt: (T: number) => number
  if (method.kind === 'model' && method.model.kind === 'integrated-cte') {
    return sampleIntegratedCurve(input, method.model, samples)
  }
  if (method.kind === 'model') {
    ;[lo, hi] = method.model.equationRangeK
    lo = Math.max(lo, PLOT_MIN_K)
    const ei = referenceStrain(method.model, Ti)
    lengthAt = (T) => (Li * (1 + referenceStrain(method.model, T))) / (1 + ei)
  } else {
    const a = Math.min(Ti, input.finalK)
    const b = Math.max(Ti, input.finalK)
    const pad = Math.max((b - a) * 0.1, 1)
    lo = Math.max(a - pad, 0.01)
    hi = b + pad
    const { alphaPerK, convention } = method
    lengthAt = (T) => {
      const x = alphaPerK * (T - Ti)
      return convention === 'mean-linear' ? Li * (1 + x) : Li * Math.exp(x)
    }
  }
  const points: CurvePoint[] = []
  for (let i = 0; i <= samples; i++) {
    const T = lo + ((hi - lo) * i) / samples
    points.push({ kelvin: T, lengthM: lengthAt(T) })
  }
  return points
}

/** Plots start no lower than this (some equation ranges begin at 0 K). */
const PLOT_MIN_K = 1

/** Integrated-CTE curves: accumulate ε along the grid instead of re-integrating from 293 K at every point. */
function sampleIntegratedCurve(input: ThermalInputs, model: IntegratedCteModel, samples: number): CurvePoint[] {
  const lo = Math.max(model.equationRangeK[0], PLOT_MIN_K)
  const hi = model.equationRangeK[1]
  const alpha = (T: number) => cteAt(model, T)
  const strainAtLo = referenceStrain(model, lo)
  const ei = referenceStrain(model, input.initialK)
  const points: CurvePoint[] = []
  let strain = strainAtLo
  let prev = lo
  for (let i = 0; i <= samples; i++) {
    const T = lo + ((hi - lo) * i) / samples
    strain += integrate(alpha, prev, T)
    prev = T
    points.push({ kelvin: T, lengthM: (input.initialLengthM * (1 + strain)) / (1 + ei) })
  }
  return points
}
