/**
 * Shared data-record types. Reference values, computed values, manufacturer
 * guidance, and user presets must stay distinguishable (brief, Product objective).
 */

export interface SourceRecord {
  id: string
  title: string
  publisher: string
  url: string
  /** ISO date the source was retrieved/checked. */
  retrieved: string
  /** Page, table, or section used. */
  locator: string
  /** Edition/revision, if stated. */
  edition?: string
  notes?: string
}

/**
 * Status of a property value. Missing, not applicable, not observed, and
 * unverified are distinct states, and none of them is ever shown as zero.
 */
export type PropertyStatus = 'value' | 'missing' | 'not-applicable' | 'not-observed' | 'unverified'

/** Origin of a displayed number. */
export type ValueOrigin = 'reference' | 'computed' | 'manufacturer-guidance' | 'user-preset'

export interface MaterialIdentity {
  id: string
  /** Display name, e.g. "Aluminum 6061-T6". */
  name: string
  /** Alloy/grade designation and identifiers, e.g. "6061 (UNS A96061)". */
  designation: string
  /** Temper / heat treatment / conditioning state. */
  condition: string
  family: string
  subfamily: string
  /** Product form, or an explicit statement that the source does not specify it. */
  productForm: string
}
