import type { SourceRecord } from './types'
import { NIST_CRYO, cryoSourceId } from './nist-cryogenic'

/** Source registry. Details and transcription notes: docs/DATA_SOURCES.md. */
const STATIC_SOURCES: Record<string, SourceRecord> = {
  'nist-bradley-radebaugh': {
    id: 'nist-bradley-radebaugh',
    title: 'Properties of Selected Materials at Cryogenic Temperatures',
    publisher: 'P. E. Bradley and R. Radebaugh, NIST',
    url: 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059',
    retrieved: '2026-10-22',
    locator: 'pp. 5–14, tables evaluated from the NIST material-property equations; p. 1 on fit vs. data uncertainty',
    notes: 'Used to verify the transcribed equations, not as independent data.',
  },
  'nbs-monograph-29': {
    id: 'nbs-monograph-29',
    title: 'Thermal Expansion of Technical Solids at Low Temperatures: A Compilation from the Literature',
    publisher: 'R. J. Corruccini and J. J. Gniewek, NBS Monograph 29 (1961)',
    url: 'https://doi.org/10.6028/NBS.MONO.29',
    retrieved: '2026-10-22',
    locator: 'Table 2.1, Elements: aluminum, copper, silicon, 10⁵·(L293 − LT)/L293',
    edition: 'Issued May 19, 1961',
    notes: 'Measured data used as independent benchmarks.',
  },
}

/** One record per NIST material page in the snapshot. */
const NIST_PAGE_SOURCES: Record<string, SourceRecord> = Object.fromEntries(
  NIST_CRYO.materials.map((m) => [
    cryoSourceId(m.id),
    {
      id: cryoSourceId(m.id),
      title: `Material Properties: ${m.nistName}`,
      publisher: 'NIST Cryogenic Technologies Group, Cryogenic Material Properties database',
      url: m.url,
      retrieved: NIST_CRYO.retrieved,
      locator: `property coefficient tables (snapshot ${m.snapshotFile})`,
    } satisfies SourceRecord,
  ]),
)

export const SOURCES: Record<string, SourceRecord> = { ...STATIC_SOURCES, ...NIST_PAGE_SOURCES }

export function getSource(id: string): SourceRecord {
  const source = SOURCES[id]
  if (!source) throw new Error(`Unknown source id: ${id}`)
  return source
}
