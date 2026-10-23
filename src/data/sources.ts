import type { SourceRecord } from './types'

/** Source registry. Details and transcription notes: docs/DATA_SOURCES.md. */
export const SOURCES: Record<string, SourceRecord> = {
  'nist-6061-t6': {
    id: 'nist-6061-t6',
    title: 'Material Properties: 6061-T6 Aluminum (UNS A96061)',
    publisher: 'NIST Cryogenic Technologies Group, Cryogenic Material Properties database',
    url: 'https://trc.nist.gov/cryogenics/materials/6061%20Aluminum/6061_T6Aluminum_rev.htm',
    retrieved: '2026-10-22',
    locator: '"Linear expansion" column: coefficients a–e, T_low, f, data/equation range, curve-fit error',
    notes:
      'The NIST reference list does not name the measured data behind the linear-expansion fit (docs/DECISIONS.md Q-003).',
  },
  'nist-bradley-radebaugh': {
    id: 'nist-bradley-radebaugh',
    title: 'Properties of Selected Materials at Cryogenic Temperatures',
    publisher: 'P. E. Bradley and R. Radebaugh, NIST',
    url: 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059',
    retrieved: '2026-10-22',
    locator: 'p. 10, "Linear Thermal Expansion (in 10⁻⁵)", Al 6061 column; p. 1 on fit vs. data uncertainty',
    notes: 'Tables evaluated by NIST from the same equations. Used to verify the implementation, not as independent data.',
  },
  'nbs-monograph-29': {
    id: 'nbs-monograph-29',
    title: 'Thermal Expansion of Technical Solids at Low Temperatures: A Compilation from the Literature',
    publisher: 'R. J. Corruccini and J. J. Gniewek, NBS Monograph 29 (1961)',
    url: 'https://doi.org/10.6028/NBS.MONO.29',
    retrieved: '2026-10-22',
    locator: 'Table 2.1, Elements: aluminum, 10⁵·(L293 − LT)/L293',
    edition: 'Issued May 19, 1961',
    notes: 'Measured pure-aluminum data, used as a material-proxy benchmark. 6061 is not tabulated.',
  },
}

export function getSource(id: string): SourceRecord {
  const source = SOURCES[id]
  if (!source) throw new Error(`Unknown source id: ${id}`)
  return source
}
