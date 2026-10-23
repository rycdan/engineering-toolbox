import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LAYOUT_PATH, VERIFICATION_PATH, verifyDataset, type Layout } from '../../tools/nist-cryogenic/verify-bradley'
import { NIST_CRYO } from '../../src/data/nist-cryogenic'

/**
 * TE-B5 / NIST-B: every dataset model compared with NIST's evaluated tables
 * (Bradley & Radebaugh). See tools/nist-cryogenic/verify-bradley.ts for the
 * method and the documented table anomalies.
 */
const layout = JSON.parse(readFileSync(LAYOUT_PATH, 'utf8')) as Layout
const committed = JSON.parse(readFileSync(VERIFICATION_PATH, 'utf8')) as ReturnType<typeof verifyDataset>
const fresh = verifyDataset(NIST_CRYO, layout)

describe('NIST evaluated-table verification', () => {
  it('layout data comes from the committed PDF', () => {
    const pdf = readFileSync('data-sources/nist-bradley-radebaugh/properties-of-selected-materials-at-cryogenic-temperatures.pdf')
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(layout.pdfSha256)
  })

  it('committed verification equals a fresh run', () => {
    expect(fresh).toEqual(committed)
  })

  it('every model is classified', () => {
    expect(fresh.models).toHaveLength(NIST_CRYO.materials.flatMap((m) => m.models).length)
  })

  it('the models that differ are exactly the documented ones', () => {
    // Explained in docs/DATA_SOURCES.md. None is used by a calculator yet.
    expect(fresh.models.filter((m) => m.status === 'differs').map((m) => m.modelId).sort()).toEqual([
      'apiezon-n/specific-heat',
      'copper-ofhc/specific-heat',
      'g10-cr/thermal-conductivity/normal-direction',
      'polyamide-nylon/specific-heat',
      'ss-304/specific-heat',
      'ss-310/specific-heat',
    ])
  })

  it('most models match to printed precision', () => {
    expect(fresh.models.filter((m) => m.status === 'exact').length).toBeGreaterThanOrEqual(80)
  })

  it('image-transcribed equations (Kevlar k, silicon CTE) are confirmed by the tables', () => {
    for (const id of ['kevlar-49-fiber/thermal-conductivity', 'kevlar-49-composite/thermal-conductivity', 'silicon/expansion-coefficient']) {
      expect(['exact', 'agrees']).toContain(fresh.models.find((m) => m.modelId === id)!.status)
    }
  })
})
