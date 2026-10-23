import { parseNumber, type Issue } from '../../engineering/outcome'
import {
  THERMAL_CALC_VERSION,
  computeThermalLengthChange,
  type ConstantCteConvention,
  type ThermalInputs,
  type ThermalMethod,
  type ThermalResult,
} from '../../engineering/thermal/expansion'
import {
  cteToPerKelvin,
  isCteUnit,
  isLengthUnit,
  isTemperatureUnit,
  lengthToMeters,
  temperatureToKelvin,
  type CteUnit,
  type LengthUnit,
  type TemperatureUnit,
} from '../../engineering/units'
import { DEFAULT_THERMAL_MODEL_ID, findThermalModel } from '../../data/thermal'
import { DATASET_VERSION } from '../../data/version'

export type MethodKind = 'model' | 'constant-cte'

/** Form state: raw text as typed, plus unit selections. Serialized to the URL. */
export interface ThermalFormState {
  method: MethodKind
  modelId: string
  cte: string
  cteUnit: CteUnit
  convention: ConstantCteConvention
  length: string
  lengthUnit: LengthUnit
  initialT: string
  initialTUnit: TemperatureUnit
  finalT: string
  finalTUnit: TemperatureUnit
  outLengthUnit: LengthUnit
  changeUnit: LengthUnit
}

/** Default example: a 100 mm 6061-T6 part cooled from 20 °C to liquid-nitrogen temperature. */
export const DEFAULT_THERMAL_STATE: ThermalFormState = {
  method: 'model',
  modelId: DEFAULT_THERMAL_MODEL_ID,
  cte: '',
  cteUnit: 'ppm_per_K',
  convention: 'mean-linear',
  length: '100',
  lengthUnit: 'mm',
  initialT: '20',
  initialTUnit: 'C',
  finalT: '77',
  finalTUnit: 'K',
  outLengthUnit: 'mm',
  changeUnit: 'um',
}

const KEYS = {
  method: 'method',
  modelId: 'model',
  cte: 'cte',
  cteUnit: 'cteU',
  convention: 'conv',
  length: 'L',
  lengthUnit: 'LU',
  initialT: 'Ti',
  initialTUnit: 'TiU',
  finalT: 'Tf',
  finalTUnit: 'TfU',
  outLengthUnit: 'outU',
  changeUnit: 'dU',
} as const satisfies Record<keyof ThermalFormState, string>

export function stateToParams(state: ThermalFormState): URLSearchParams {
  const params = new URLSearchParams()
  params.set(KEYS.method, state.method)
  if (state.method === 'model') {
    params.set(KEYS.modelId, state.modelId)
  } else {
    params.set(KEYS.cte, state.cte)
    params.set(KEYS.cteUnit, state.cteUnit)
    params.set(KEYS.convention, state.convention)
  }
  params.set(KEYS.length, state.length)
  params.set(KEYS.lengthUnit, state.lengthUnit)
  params.set(KEYS.initialT, state.initialT)
  params.set(KEYS.initialTUnit, state.initialTUnit)
  params.set(KEYS.finalT, state.finalT)
  params.set(KEYS.finalTUnit, state.finalTUnit)
  params.set(KEYS.outLengthUnit, state.outLengthUnit)
  params.set(KEYS.changeUnit, state.changeUnit)
  params.set('dv', DATASET_VERSION)
  params.set('cv', THERMAL_CALC_VERSION)
  return params
}

export interface ParsedThermalUrl {
  state: ThermalFormState
  /** Messages about URL values that were ignored or versions that differ. */
  warnings: string[]
}

/** Restore state from URL params; unknown/invalid selections fall back to defaults with a warning. */
export function paramsToState(params: URLSearchParams): ParsedThermalUrl {
  const warnings: string[] = []
  const state: ThermalFormState = { ...DEFAULT_THERMAL_STATE }
  if ([...params.keys()].length === 0) return { state, warnings }

  const text = (key: string): string | undefined => params.get(key) ?? undefined
  const pick = <T extends string>(key: string, guard: (v: string) => v is T, fallback: T, what: string): T => {
    const v = params.get(key)
    if (v === null) return fallback
    if (guard(v)) return v
    warnings.push(`Ignored unknown ${what} "${v}" in the link.`)
    return fallback
  }

  state.method = pick(KEYS.method, (v): v is MethodKind => v === 'model' || v === 'constant-cte', state.method, 'method')
  const modelId = text(KEYS.modelId)
  if (modelId !== undefined) {
    const found = findThermalModel(modelId)
    if (found) state.modelId = found.id
    else warnings.push(`The linked material model "${modelId}" is not in dataset ${DATASET_VERSION}.`)
  }
  state.cte = text(KEYS.cte) ?? state.cte
  state.cteUnit = pick(KEYS.cteUnit, isCteUnit, state.cteUnit, 'CTE unit')
  state.convention = pick(
    KEYS.convention,
    (v): v is ConstantCteConvention => v === 'mean-linear' || v === 'instantaneous-exponential',
    state.convention,
    'CTE convention',
  )
  state.length = text(KEYS.length) ?? state.length
  state.lengthUnit = pick(KEYS.lengthUnit, isLengthUnit, state.lengthUnit, 'length unit')
  state.initialT = text(KEYS.initialT) ?? state.initialT
  state.initialTUnit = pick(KEYS.initialTUnit, isTemperatureUnit, state.initialTUnit, 'temperature unit')
  state.finalT = text(KEYS.finalT) ?? state.finalT
  state.finalTUnit = pick(KEYS.finalTUnit, isTemperatureUnit, state.finalTUnit, 'temperature unit')
  state.outLengthUnit = pick(KEYS.outLengthUnit, isLengthUnit, state.outLengthUnit, 'length unit')
  state.changeUnit = pick(KEYS.changeUnit, isLengthUnit, state.changeUnit, 'length unit')

  const dv = params.get('dv')
  if (dv !== null && dv !== DATASET_VERSION) {
    warnings.push(`This link was created with dataset ${dv}; the app now uses dataset ${DATASET_VERSION}. Results may differ.`)
  }
  const cv = params.get('cv')
  if (cv !== null && cv !== THERMAL_CALC_VERSION) {
    warnings.push(`This link was created with ${cv}; the app now uses ${THERMAL_CALC_VERSION}. Results may differ.`)
  }
  return { state, warnings }
}

export interface ResolvedThermal {
  inputs: ThermalInputs
  method: ThermalMethod
}

/** Parse text fields and convert to canonical units. */
export function resolveThermalState(state: ThermalFormState): { ok: true; value: ResolvedThermal } | { ok: false; issues: Issue[] } {
  const issues: Issue[] = []
  const num = (text: string, field: string, label: string): number => {
    const v = parseNumber(text)
    if (v === null) {
      issues.push({ field, message: text.trim() === '' ? `Enter ${label}.` : `${label[0]!.toUpperCase()}${label.slice(1)} must be a number.` })
      return Number.NaN
    }
    return v
  }
  const length = num(state.length, 'length', 'the initial length')
  const Ti = num(state.initialT, 'initialT', 'the initial temperature')
  const Tf = num(state.finalT, 'finalT', 'the final temperature')

  let method: ThermalMethod | null = null
  if (state.method === 'model') {
    const model = findThermalModel(state.modelId)
    if (!model) issues.push({ field: 'model', message: 'Select a material model.' })
    else method = { kind: 'model', model }
  } else {
    const cte = num(state.cte, 'cte', 'a CTE value')
    method = { kind: 'constant-cte', alphaPerK: cteToPerKelvin(cte, state.cteUnit), convention: state.convention }
  }
  if (issues.length > 0 || !method) return { ok: false, issues }
  return {
    ok: true,
    value: {
      inputs: {
        initialLengthM: lengthToMeters(length, state.lengthUnit),
        initialK: temperatureToKelvin(Ti, state.initialTUnit),
        finalK: temperatureToKelvin(Tf, state.finalTUnit),
      },
      method,
    },
  }
}

export type ThermalEvaluation =
  | { ok: true; resolved: ResolvedThermal; result: ThermalResult }
  | { ok: false; issues: Issue[] }

export function evaluateThermal(state: ThermalFormState): ThermalEvaluation {
  const resolved = resolveThermalState(state)
  if (!resolved.ok) return resolved
  const outcome = computeThermalLengthChange(resolved.value.inputs, resolved.value.method)
  if (!outcome.ok) return outcome
  return { ok: true, resolved: resolved.value, result: outcome.value }
}
