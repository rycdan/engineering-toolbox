import datasetJson from './dataset.json'
import verificationJson from './bradley-verification.json'
import type { CryoDataset, CryoMaterial, CryoPropertyModel } from './types'

/**
 * NIST cryogenic material-property dataset, generated from saved page
 * snapshots by tools/nist-cryogenic/extract.ts and checked against NIST's
 * evaluated tables by tools/nist-cryogenic/verify-bradley.ts.
 */
export const NIST_CRYO: CryoDataset = datasetJson as CryoDataset

export type VerificationStatus = 'exact' | 'agrees' | 'differs' | 'not-tabulated'

export interface ModelVerification {
  modelId: string
  bradleyHeader: string | null
  status: VerificationStatus
  page: number | null
  rowsCompared: number
  rowsExact: number
  maxRelativeDeviation: number | null
  polynomialBelowTLowRows: number[]
  notes: string[]
}

const VERIFICATION = new Map((verificationJson.models as ModelVerification[]).map((v) => [v.modelId, v]))

export function cryoMaterial(id: string): CryoMaterial | undefined {
  return NIST_CRYO.materials.find((m) => m.id === id)
}

export function cryoModel(id: string): { material: CryoMaterial; model: CryoPropertyModel } | undefined {
  for (const material of NIST_CRYO.materials) {
    const model = material.models.find((m) => m.id === id)
    if (model) return { material, model }
  }
  return undefined
}

export function cryoVerification(modelId: string): ModelVerification | undefined {
  return VERIFICATION.get(modelId)
}

/** Source-registry id for a material's NIST page. */
export function cryoSourceId(materialId: string): string {
  return `nist-cryo:${materialId}`
}

/** One-line, user-facing summary of how a model compares with NIST's evaluated tables. */
export function verificationSummary(v: ModelVerification | undefined): string {
  if (!v) return 'Not checked.'
  const pct = (x: number | null) => (x === null ? '' : `${(x * 100).toFixed(2).replace(/\.?0+$/, '')} %`)
  switch (v.status) {
    case 'exact':
      return `Matches NIST’s evaluated table (Bradley & Radebaugh, p. ${v.page}) at all ${v.rowsCompared} compared temperatures, to printed precision.`
    case 'agrees':
      return `Agrees with NIST’s evaluated table (p. ${v.page}) within ${pct(v.maxRelativeDeviation)} at ${v.rowsCompared} temperatures; ${v.rowsExact} match to printed precision.`
    case 'differs':
      return v.maxRelativeDeviation === null
        ? 'NIST’s evaluated table lists this property, but no column agrees with the page’s equation within 0.1 %.'
        : `Differs from NIST’s evaluated table (p. ${v.page}) by up to ${pct(v.maxRelativeDeviation)}.`
    case 'not-tabulated':
      return 'Not in NIST’s evaluated tables; transcribed from the NIST page only.'
  }
}
