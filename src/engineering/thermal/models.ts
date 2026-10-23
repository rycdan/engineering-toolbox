import { evaluateSegments, findSegment, type Segment } from '../cryogenic/equations'
import { integrate } from '../cryogenic/integrate'

/**
 * Temperature-dependent thermal-expansion models.
 *
 * - reference-strain: the source publishes the integrated relative length
 *   change ε(T) = (L(T) − L_ref)/L_ref. Used through the ratio method and never
 *   integrated again.
 * - integrated-cte: the source publishes only a CTE curve α(T). ε(T) is its
 *   integral from the reference temperature, with α taken as referenced to
 *   L_ref: ε(T) = ∫ α dT (see docs/ENGINEERING_METHODS.md).
 */

export interface Breakpoint {
  kelvin: number
  /** Which segment owns T exactly equal to the breakpoint. */
  owner: 'lower' | 'upper'
  /** The source's own wording for the segment conditions. */
  sourceWording: string
  /** |strain(upper) − strain(lower)| at the breakpoint, computed from the published equations. */
  jumpStrain: number
}

interface ThermalModelBase {
  id: string
  revision: number
  materialId: string
  /** Short label for selectors. */
  label: string
  /** Direction, density, or other variant descriptor from the source, if any. */
  variant: string | null
  /** Material family, for grouping. */
  family: string
  /** The source's definition of the tabulated quantity. */
  quantity: string
  referenceTemperatureK: number
  /** canonical value = equation value × scale (strain for reference-strain, 1/K for integrated-cte) */
  scale: number
  /** Human-readable equation as published. */
  equationText: string
  segments: readonly Segment[]
  breakpoints: readonly Breakpoint[]
  /** Range over which the equation is stated valid (blocked outside). */
  equationRangeK: readonly [number, number]
  /** Range covered by the measured data behind the fit; null when the source does not state it. */
  dataRangeK: readonly [number, number] | null
  fitErrorText: string
  sourceIds: readonly string[]
  /** Limitations displayed next to results from this model. */
  limitations: readonly string[]
  /** Comparison with NIST's evaluated tables, as displayed. */
  verification: string
}

export interface ReferenceStrainModel extends ThermalModelBase {
  kind: 'reference-strain'
}

export interface IntegratedCteModel extends ThermalModelBase {
  kind: 'integrated-cte'
  /** α is taken as (1/L_ref)·dL/dT, so ε(T) = ∫ α dT from the reference temperature. */
  convention: 'reference-length'
}

export type ThermalExpansionModel = ReferenceStrainModel | IntegratedCteModel

export function isInEquationRange(model: ThermalExpansionModel, kelvin: number): boolean {
  const [lo, hi] = model.equationRangeK
  return Number.isFinite(kelvin) && kelvin > 0 && kelvin >= lo && kelvin <= hi && findSegment(model.segments, kelvin) !== undefined
}

function scaledValue(model: ThermalExpansionModel, kelvin: number): number {
  const y = evaluateSegments(model.segments, kelvin)
  if (y === undefined) throw new RangeError(`${kelvin} K is outside every segment of ${model.label}`)
  return y * model.scale
}

/** α(T) in 1/K for an integrated-CTE model. */
export function cteAt(model: IntegratedCteModel, kelvin: number): number {
  return scaledValue(model, kelvin)
}

/**
 * ε(T) = (L(T) − L_ref)/L_ref relative to the model's reference temperature.
 * Throws RangeError outside the equation range; callers validate first.
 */
export function referenceStrain(model: ThermalExpansionModel, kelvin: number): number {
  if (!isInEquationRange(model, kelvin)) {
    throw new RangeError(
      `${kelvin} K is outside the ${model.label} equation range ${model.equationRangeK[0]}–${model.equationRangeK[1]} K`,
    )
  }
  if (model.kind === 'reference-strain') return scaledValue(model, kelvin)
  return integrate((t) => scaledValue(model, t), model.referenceTemperatureK, kelvin)
}
