import type { MaterialIdentity } from './types'

/**
 * Material identities referenced by calculator models. The general Materials
 * tab (brief §4) will have its own catalog; a calculator model's presence here
 * does not imply any general-property record exists.
 */
export const MATERIALS: Record<string, MaterialIdentity> = {
  'al-6061-t6': {
    id: 'al-6061-t6',
    name: 'Aluminum 6061-T6',
    designation: '6061 (UNS A96061)',
    condition: 'T6',
    family: 'Metal',
    subfamily: 'Wrought aluminum alloy',
    productForm: 'Not specified by source',
  },
}
