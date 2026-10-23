/**
 * Unit conversions at input/output boundaries.
 * Canonical internal units: length in meters, temperature in kelvin,
 * temperature difference in kelvin, CTE in 1/K. See docs/ENGINEERING_METHODS.md.
 */

// ---------------------------------------------------------------- length

export type LengthUnit = 'm' | 'mm' | 'um' | 'in' | 'mil' | 'ft'

interface UnitInfo {
  label: string
  name: string
}

/** Exact factors: 1 in = 0.0254 m, 1 ft = 0.3048 m (international inch/foot). */
export const LENGTH_UNITS: Record<LengthUnit, UnitInfo & { meters: number }> = {
  mm: { label: 'mm', name: 'millimeters', meters: 1e-3 },
  um: { label: 'µm', name: 'micrometers', meters: 1e-6 },
  m: { label: 'm', name: 'meters', meters: 1 },
  in: { label: 'in', name: 'inches', meters: 0.0254 },
  mil: { label: 'mil', name: 'mils (0.001 in)', meters: 0.0000254 },
  ft: { label: 'ft', name: 'feet', meters: 0.3048 },
}

export const LENGTH_UNIT_IDS = Object.keys(LENGTH_UNITS) as LengthUnit[]

export function lengthToMeters(value: number, unit: LengthUnit): number {
  return value * LENGTH_UNITS[unit].meters
}

export function metersToLength(meters: number, unit: LengthUnit): number {
  return meters / LENGTH_UNITS[unit].meters
}

// ----------------------------------------------------------- temperature

export type TemperatureUnit = 'K' | 'C' | 'F' | 'R'

export const TEMPERATURE_UNITS: Record<TemperatureUnit, UnitInfo> = {
  K: { label: 'K', name: 'kelvin' },
  C: { label: '°C', name: 'degrees Celsius' },
  F: { label: '°F', name: 'degrees Fahrenheit' },
  R: { label: '°R', name: 'degrees Rankine' },
}

export const TEMPERATURE_UNIT_IDS = Object.keys(TEMPERATURE_UNITS) as TemperatureUnit[]

/** Convert a temperature *point* (offsets apply) to kelvin. */
export function temperatureToKelvin(value: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'K':
      return value
    case 'C':
      return value + 273.15
    case 'F':
      return ((value + 459.67) * 5) / 9
    case 'R':
      return (value * 5) / 9
  }
}

/** Convert a temperature *point* in kelvin to the given unit. */
export function kelvinToTemperature(kelvin: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'K':
      return kelvin
    case 'C':
      return kelvin - 273.15
    case 'F':
      return (kelvin * 9) / 5 - 459.67
    case 'R':
      return (kelvin * 9) / 5
  }
}

/** Convert a temperature *difference* (no offsets) to kelvin. */
export function temperatureDifferenceToKelvin(delta: number, unit: TemperatureUnit): number {
  return unit === 'K' || unit === 'C' ? delta : (delta * 5) / 9
}

/** Convert a temperature *difference* in kelvin to the given unit. */
export function kelvinDifferenceToUnit(deltaK: number, unit: TemperatureUnit): number {
  return unit === 'K' || unit === 'C' ? deltaK : (deltaK * 9) / 5
}

// ------------------------------------------------------------------- CTE

/** CTE entry units, all in parts per million per degree. */
export type CteUnit = 'ppm_per_K' | 'ppm_per_C' | 'ppm_per_F'

export const CTE_UNITS: Record<CteUnit, UnitInfo & { perKelvinFactor: number }> = {
  ppm_per_K: { label: '×10⁻⁶/K', name: 'µm/(m·K)', perKelvinFactor: 1e-6 },
  ppm_per_C: { label: '×10⁻⁶/°C', name: 'µm/(m·°C)', perKelvinFactor: 1e-6 },
  ppm_per_F: { label: '×10⁻⁶/°F', name: 'µin/(in·°F)', perKelvinFactor: 1.8e-6 },
}

export const CTE_UNIT_IDS = Object.keys(CTE_UNITS) as CteUnit[]

export function cteToPerKelvin(value: number, unit: CteUnit): number {
  return value * CTE_UNITS[unit].perKelvinFactor
}

export function ctePerKelvinToUnit(perKelvin: number, unit: CteUnit): number {
  return perKelvin / CTE_UNITS[unit].perKelvinFactor
}

// ---------------------------------------------------------------- guards

export function isLengthUnit(value: string): value is LengthUnit {
  return Object.hasOwn(LENGTH_UNITS, value)
}

export function isTemperatureUnit(value: string): value is TemperatureUnit {
  return Object.hasOwn(TEMPERATURE_UNITS, value)
}

export function isCteUnit(value: string): value is CteUnit {
  return Object.hasOwn(CTE_UNITS, value)
}
