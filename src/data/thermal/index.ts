import type { ThermalExpansionModel } from '../../engineering/thermal/models'
import { NIST_6061_T6_EXPANSION } from './nist6061T6'

/** Verified thermal-expansion models available to the calculator. */
export const THERMAL_MODELS: readonly ThermalExpansionModel[] = [NIST_6061_T6_EXPANSION]

export function findThermalModel(id: string): ThermalExpansionModel | undefined {
  return THERMAL_MODELS.find((m) => m.id === id)
}
