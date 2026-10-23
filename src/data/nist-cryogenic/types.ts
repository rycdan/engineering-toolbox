import type { Segment } from '../../engineering/cryogenic/equations'

/**
 * Generated NIST cryogenic material-property dataset (see
 * tools/nist-cryogenic/extract.ts). Values are transcribed from saved page
 * snapshots in data-sources/nist-cryogenic/; do not edit dataset.json by hand.
 */

export type CryoProperty =
  | 'thermal-conductivity'
  | 'specific-heat'
  | 'linear-expansion'
  | 'expansion-coefficient'
  | 'youngs-modulus'

/** Canonical unit of the scaled value (equation value × scale). */
export type CryoUnit = 'W/(m·K)' | 'J/(kg·K)' | 'GPa' | 'm/m' | '1/K'

export interface FitError {
  /** Verbatim label and value, e.g. "curve fit % error relative to data: 2". */
  label: string
  text: string
  /** Single percentage when the source states one; otherwise null. */
  percent: number | null
}

export interface CryoPropertyModel {
  id: string
  property: CryoProperty
  /** Cleaned variant descriptor (direction, density, RRR, …) or null. */
  variant: string | null
  /** Verbatim column header(s) from the source page. */
  sourceHeaders: string[]
  /** Verbatim units cell from the source page. */
  sourceUnits: string
  unit: CryoUnit
  /** canonical value = equation value × scale */
  scale: number
  segments: Segment[]
  equationRangeK: [number, number]
  /** Measured-data coverage, or null when the source does not state it separately. */
  dataRangeK: [number, number] | null
  equationRangeText: string
  dataRangeText: string | null
  fitError: FitError[]
  /** Description of the published equation form. */
  equationText: string
  /** Low-temperature constant below T_low, as published (linear expansion). */
  lowTemperatureConstant: { tLowK: number; value: number } | null
  /** Extraction notes (merges, quirks handled), shown with the model. */
  notes: string[]
}

export interface CryoMaterial {
  id: string
  /** Display name. */
  name: string
  /** Name exactly as on the NIST index. */
  nistName: string
  family: string
  subfamily: string
  url: string
  snapshotFile: string
  sha256: string
  /** Identity notes (condition, purity, form), with their basis. */
  identityNotes: string[]
  models: CryoPropertyModel[]
  /** Content on the page that is not represented as a model, and why. */
  unsupported: string[]
}

export interface CryoDataset {
  dataset: 'nist-cryogenic-material-properties'
  indexUrl: string
  retrieved: string
  extractorVersion: string
  materials: CryoMaterial[]
}
