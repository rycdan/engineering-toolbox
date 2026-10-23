import { THERMAL_CALC_VERSION, type ThermalResult } from '../../engineering/thermal/expansion'
import { formatPrecise, formatSignedPrecise } from '../../engineering/format'
import {
  CTE_UNITS,
  LENGTH_UNITS,
  TEMPERATURE_UNITS,
  metersToLength,
} from '../../engineering/units'
import { getSource } from '../../data/sources'
import { MATERIALS } from '../../data/materials'
import { DATASET_VERSION } from '../../data/version'
import type { ResolvedThermal, ThermalFormState } from './thermalState'

/** Significant figures in copied/printed records (more than the on-screen summary). */
const RECORD_DIGITS = 12

export function convention(state: ThermalFormState): string {
  return state.convention === 'mean-linear'
    ? 'mean CTE referenced to initial length: Lf = Li·(1 + α·ΔT)'
    : 'constant instantaneous CTE: Lf = Li·exp(α·ΔT)'
}

const kelvinText = (kelvin: number) => `${formatPrecise(kelvin, RECORD_DIGITS)} K`

/** Plain-text calculation record: everything needed to reproduce the result. */
export function buildThermalRecord(
  state: ThermalFormState,
  resolved: ResolvedThermal,
  result: ThermalResult,
  url: string,
  generatedAt: Date,
): string {
  const { inputs, method } = resolved
  const lu = LENGTH_UNITS[state.lengthUnit].label
  const ou = LENGTH_UNITS[state.outLengthUnit].label
  const du = LENGTH_UNITS[state.changeUnit].label
  const lines: string[] = [
    'Engineering Toolbox: thermal expansion / contraction calculation record',
    `Generated: ${generatedAt.toISOString()}`,
    `Calculation version: ${THERMAL_CALC_VERSION}`,
    `Dataset version: ${DATASET_VERSION}`,
    '',
    'METHOD',
  ]
  if (method.kind === 'model') {
    const m = method.model
    const mat = MATERIALS[m.materialId]
    lines.push(
      `  Temperature-dependent reference-strain model: ${m.label}`,
      `  Model id: ${m.id} (revision ${m.revision})`,
      ...(mat ? [`  Material: ${mat.name}; ${mat.designation}; condition ${mat.condition}; product form: ${mat.productForm}`] : []),
      `  Source quantity: ${m.quantity}, scale ${m.scale}`,
      `  Equation: ${m.equationText}`,
      `  Equation range ${m.equationRangeK[0]}–${m.equationRangeK[1]} K; data range ${m.dataRangeK[0]}–${m.dataRangeK[1]} K; fit error ${m.fitErrorPercent ?? 'not stated'} % (${m.fitErrorBasis})`,
      '  Ratio method: Lf = Li·(1 + ε(Tf)) / (1 + ε(Ti))',
    )
  } else {
    lines.push(
      `  Constant-CTE estimate (user supplied): α = ${state.cte} ${CTE_UNITS[state.cteUnit].label} = ${formatPrecise(method.alphaPerK, RECORD_DIGITS)} 1/K`,
      `  Convention: ${convention(state)}`,
    )
  }
  lines.push(
    '',
    'INPUTS',
    `  Initial length: ${state.length} ${lu} (${formatPrecise(inputs.initialLengthM, RECORD_DIGITS)} m)`,
    `  Initial temperature: ${state.initialT} ${TEMPERATURE_UNITS[state.initialTUnit].label} = ${kelvinText(inputs.initialK)}`,
    `  Final temperature: ${state.finalT} ${TEMPERATURE_UNITS[state.finalTUnit].label} = ${kelvinText(inputs.finalK)}`,
    '',
    'RESULTS (computed)',
    `  Final length: ${formatPrecise(metersToLength(result.finalLengthM, state.outLengthUnit), RECORD_DIGITS)} ${ou}`,
    `  Length change: ${formatSignedPrecise(metersToLength(result.changeM, state.changeUnit), RECORD_DIGITS)} ${du}`,
    `  Fractional strain ΔL/Li: ${formatSignedPrecise(result.strain, RECORD_DIGITS)} (${formatSignedPrecise(result.strain * 1e6, 8)} µε; ${formatSignedPrecise(result.strain * 100, 8)} %)`,
    `  Temperature change: ${formatSignedPrecise(result.deltaTK, RECORD_DIGITS)} K`,
    `  Mean CTE over interval: ${result.meanCtePerK === null ? 'n/a (ΔT = 0)' : `${formatPrecise(result.meanCtePerK * 1e6, 8)} ×10⁻⁶/K`}`,
  )
  if (result.strainInitialRef !== null && result.strainFinalRef !== null) {
    lines.push(
      `  ε(Ti) = ${formatSignedPrecise(result.strainInitialRef, RECORD_DIGITS)}, ε(Tf) = ${formatSignedPrecise(result.strainFinalRef, RECORD_DIGITS)} (relative to model reference)`,
    )
  }
  const limitations = method.kind === 'model' ? [...method.model.limitations] : []
  const notes = [...result.notes.map((n) => `${n.severity === 'warning' ? 'WARNING: ' : ''}${n.text}`), ...limitations]
  if (notes.length > 0) {
    lines.push('', 'NOTES AND LIMITATIONS', ...notes.map((n) => `  - ${n}`))
  }
  if (method.kind === 'model') {
    lines.push('', 'SOURCES')
    for (const id of method.model.sourceIds) {
      const s = getSource(id)
      lines.push(`  - ${s.title}. ${s.publisher}. ${s.url} (retrieved ${s.retrieved}; ${s.locator})`)
    }
  }
  lines.push('', `Reproduce: ${url}`)
  return lines.join('\n')
}
