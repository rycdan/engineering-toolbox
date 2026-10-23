/**
 * Temperature-dependent thermal-expansion model definitions.
 *
 * Only the "reference-strain" kind exists in v1: sources that publish the
 * integrated relative length change ε(T) = (L(T) − L_ref)/L_ref. Such curves
 * are used through the ratio method and are never integrated again.
 */

/** Interval bound in kelvin with explicit ownership of the endpoint. */
export interface Bound {
  kelvin: number
  inclusive: boolean
}

interface SegmentBase {
  lower: Bound
  upper: Bound
}

/** y = Σ coefficients[i] · T^i, T in kelvin. */
export interface PolynomialSegment extends SegmentBase {
  kind: 'polynomial'
  coefficients: readonly number[]
}

/** y = value (constant). */
export interface ConstantSegment extends SegmentBase {
  kind: 'constant'
  value: number
}

export type Segment = PolynomialSegment | ConstantSegment

export interface Breakpoint {
  kelvin: number
  /** Which segment owns T exactly equal to the breakpoint. */
  owner: 'lower' | 'upper'
  /** The source's own wording for the segment conditions. */
  sourceWording: string
  /** Documented upper bound on |strain jump| at the breakpoint (tested). */
  maxJumpStrain: number
  rationale: string
}

export interface ReferenceStrainModel {
  kind: 'reference-strain'
  id: string
  revision: number
  materialId: string
  /** Short label for selectors. */
  label: string
  /** The source's definition of the tabulated quantity, e.g. "(L − L293)/L293". */
  quantity: string
  referenceTemperatureK: number
  /** strain = y × scale */
  scale: number
  /** Human-readable equation as published. */
  equationText: string
  segments: readonly Segment[]
  breakpoints: readonly Breakpoint[]
  /** Range over which the equation is stated valid (blocked outside). */
  equationRangeK: readonly [number, number]
  /** Range covered by the measured data behind the fit. */
  dataRangeK: readonly [number, number]
  fitErrorPercent: number | null
  fitErrorBasis: string
  sourceIds: readonly string[]
  /** Limitations displayed next to results from this model. */
  limitations: readonly string[]
}

export type ThermalExpansionModel = ReferenceStrainModel

function within(T: number, s: SegmentBase): boolean {
  const aboveLower = s.lower.inclusive ? T >= s.lower.kelvin : T > s.lower.kelvin
  const belowUpper = s.upper.inclusive ? T <= s.upper.kelvin : T < s.upper.kelvin
  return aboveLower && belowUpper
}

/** Horner evaluation of Σ c_i·x^i. */
export function evaluatePolynomial(coefficients: readonly number[], x: number): number {
  let result = 0
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = result * x + (coefficients[i] ?? 0)
  }
  return result
}

export function findSegment(model: ReferenceStrainModel, kelvin: number): Segment | undefined {
  return model.segments.find((s) => within(kelvin, s))
}

/** Raw source quantity y(T) for one segment (no range checks). */
export function evaluateSegment(segment: Segment, kelvin: number): number {
  return segment.kind === 'constant' ? segment.value : evaluatePolynomial(segment.coefficients, kelvin)
}

export function isInEquationRange(model: ReferenceStrainModel, kelvin: number): boolean {
  const [lo, hi] = model.equationRangeK
  return Number.isFinite(kelvin) && kelvin >= lo && kelvin <= hi && findSegment(model, kelvin) !== undefined
}

/**
 * ε(T) = (L(T) − L_ref)/L_ref for a reference-strain model.
 * Throws RangeError outside the equation range; callers validate first.
 */
export function referenceStrain(model: ReferenceStrainModel, kelvin: number): number {
  if (!isInEquationRange(model, kelvin)) {
    throw new RangeError(
      `${kelvin} K is outside the ${model.label} equation range ${model.equationRangeK[0]}–${model.equationRangeK[1]} K`,
    )
  }
  const segment = findSegment(model, kelvin)!
  return evaluateSegment(segment, kelvin) * model.scale
}
