import { evaluateEquation } from '../../engineering/cryogenic/equations'
import type { Breakpoint, ThermalExpansionModel } from '../../engineering/thermal/models'
import { NIST_CRYO, cryoSourceId, cryoVerification, verificationSummary } from '../nist-cryogenic'
import type { CryoMaterial, CryoPropertyModel } from '../nist-cryogenic/types'

/**
 * Thermal-expansion models available to the calculator, built from the NIST
 * cryogenic dataset:
 * - every published linear-expansion curve (reference-strain models);
 * - for materials NIST gives only a CTE curve for (OFHC copper, silicon), an
 *   integrated-CTE model.
 */

/** Old model ids still accepted in links. */
export const MODEL_ID_ALIASES: Record<string, string> = {
  'nist-6061-t6-linear-expansion': 'al-6061-t6/linear-expansion',
}

const FAMILY_ORDER = ['Metal', 'Ceramic', 'Semiconductor', 'Composite', 'Polymer', 'Natural material', 'Other']

/** Breakpoint jumps below this are below the source's printed resolution and are not called out. */
const NOTABLE_JUMP_STRAIN = 1e-7

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

/** "0.03x10^-8" → "0.03×10⁻⁸" for display. */
function prettyExponents(text: string): string {
  return text.replace(/x\s*10\^\s*(-?\d+)/g, (_, e: string) => `×10${[...e].map((c) => SUPERSCRIPT[c] ?? c).join('')}`)
}

function kelvinWithConversions(k: number): string {
  const c = k - 273.15
  const f = (k * 9) / 5 - 459.67
  return `${k} K (${c.toFixed(2)} °C, ${f.toFixed(2)} °F)`
}

function breakpointsFor(model: CryoPropertyModel): Breakpoint[] {
  const out: Breakpoint[] = []
  for (let i = 1; i < model.segments.length; i++) {
    const lower = model.segments[i - 1]!
    const upper = model.segments[i]!
    const T = upper.lower.kelvin
    const jump = Math.abs(evaluateEquation(upper.equation, T) - evaluateEquation(lower.equation, T)) * model.scale
    out.push({
      kelvin: T,
      owner: upper.lower.inclusive ? 'upper' : 'lower',
      sourceWording:
        lower.equation.form === 'constant'
          ? 'polynomial for T > T_low, constant f for T < T_low; T = T_low is not assigned'
          : 'two published fits over adjacent temperature ranges sharing this boundary',
      jumpStrain: jump,
    })
  }
  return out
}

function limitationsFor(material: CryoMaterial, model: CryoPropertyModel, breakpoints: Breakpoint[], kind: ThermalExpansionModel['kind']): string[] {
  const [lo, hi] = model.equationRangeK
  const out = [`Equation range ${lo}–${hi} K; the upper limit ${kelvinWithConversions(hi)}. Temperatures outside it are blocked.`]
  if (model.dataRangeK && (model.dataRangeK[0] !== lo || model.dataRangeK[1] !== hi)) {
    out.push(`Measured data cover ${model.dataRangeK[0]}–${model.dataRangeK[1]} K.`)
  }
  const fit = prettyExponents(model.fitError.map((f) => f.text).join('; '))
  out.push(`NIST curve-fit error relative to data: ${fit}${model.fitError.some((f) => f.percent !== null) ? ' %' : ''}. Sample-to-sample variation and measurement uncertainty are additional.`)
  if (model.variant) out.push(`Applies to: ${model.variant}.`)
  out.push(...material.identityNotes)
  for (const bp of breakpoints) {
    if (bp.jumpStrain >= NOTABLE_JUMP_STRAIN) {
      out.push(
        `At ${bp.kelvin} K the published expressions differ by ${bp.jumpStrain.toExponential(1)} strain (${bp.sourceWording}); this app uses the ${bp.owner === 'upper' ? 'higher-temperature' : 'lower-temperature'} expression at exactly ${bp.kelvin} K.`,
      )
    }
  }
  if (kind === 'integrated-cte') {
    out.push('NIST publishes only a CTE curve for this material; length change is its integral from 293 K.')
  }
  return out
}

function label(material: CryoMaterial, model: CryoPropertyModel): string {
  return model.variant ? `${material.name} (${model.variant})` : material.name
}

function build(material: CryoMaterial, model: CryoPropertyModel, kind: ThermalExpansionModel['kind']): ThermalExpansionModel {
  const breakpoints = breakpointsFor(model)
  const verification = cryoVerification(model.id)
  const base = {
    id: model.id,
    revision: 1,
    materialId: material.id,
    label: label(material, model),
    variant: model.variant,
    family: material.family,
    referenceTemperatureK: 293,
    scale: model.scale,
    equationText: model.equationText,
    segments: model.segments,
    breakpoints,
    equationRangeK: model.equationRangeK,
    dataRangeK: model.dataRangeK,
    fitErrorText: prettyExponents(model.fitError.map((f) => f.text).join('; ')),
    sourceIds: [cryoSourceId(material.id), ...(verification && verification.status !== 'not-tabulated' ? ['nist-bradley-radebaugh'] : [])],
    limitations: limitationsFor(material, model, breakpoints, kind),
    verification: verificationSummary(verification),
  }
  return kind === 'reference-strain'
    ? { ...base, kind, quantity: '(L − L293)/L293' }
    : { ...base, kind, quantity: `α (${model.sourceUnits})`, convention: 'reference-length' }
}

function familyRank(family: string): number {
  const i = FAMILY_ORDER.indexOf(family)
  return i === -1 ? FAMILY_ORDER.length : i
}

export const THERMAL_MODELS: readonly ThermalExpansionModel[] = NIST_CRYO.materials
  .flatMap((material) => {
    const expansion = material.models.filter((m) => m.property === 'linear-expansion')
    if (expansion.length > 0) return expansion.map((m) => build(material, m, 'reference-strain'))
    const cte = material.models.find((m) => m.property === 'expansion-coefficient')
    return cte ? [build(material, cte, 'integrated-cte')] : []
  })
  .sort((a, b) => familyRank(a.family) - familyRank(b.family) || a.label.localeCompare(b.label, 'en', { numeric: true }))

/** NIST materials with no expansion model (and why), for coverage display. */
export const MATERIALS_WITHOUT_EXPANSION: readonly { name: string; properties: string }[] = NIST_CRYO.materials
  .filter((m) => !THERMAL_MODELS.some((t) => t.materialId === m.id))
  .map((m) => ({
    name: m.name,
    properties: m.models.length > 0 ? [...new Set(m.models.map((x) => x.property.replace(/-/g, ' ')))].join(', ') : 'tabulated data only',
  }))

export const DEFAULT_THERMAL_MODEL_ID = 'al-6061-t6/linear-expansion'

export function findThermalModel(id: string): ThermalExpansionModel | undefined {
  const resolved = MODEL_ID_ALIASES[id] ?? id
  return THERMAL_MODELS.find((m) => m.id === resolved)
}
