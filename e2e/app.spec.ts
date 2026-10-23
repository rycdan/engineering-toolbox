import { expect, test } from '@playwright/test'

const DESTINATION_TITLES = [
  'Fasteners & Hole Preparation',
  'Machining Threads & Tolerances',
  'Shaft & Hole Fits',
  'Materials',
  'Thermal Expansion & Contraction',
  'Conductive Heat Flow',
  'Bolt Torque & Preload',
  'Pin & Slot GD&T Guide',
]

test('navigation lists all eight destinations; only thermal is available', async ({ page }) => {
  await page.goto('./')
  const nav = page.getByRole('navigation', { name: 'Tools' })
  for (const title of DESTINATION_TITLES) {
    await expect(nav.getByRole('link', { name: new RegExp(title.replace(/[&]/g, '.')) })).toBeVisible()
  }
  await expect(nav.getByText('Planned')).toHaveCount(7)
})

test('planned destinations show scope only, no inputs or numeric results', async ({ page }) => {
  for (const path of ['/fasteners', '/threads', '/fits', '/materials', '/heat-flow', '/torque', '/pin-slot']) {
    await page.goto(`./#${path}`)
    await expect(page.getByText('Not yet available.')).toBeVisible()
    await expect(page.locator('main input, main select')).toHaveCount(0)
    await expect(page.locator('main output')).toHaveCount(0)
  }
})

test.describe('thermal calculator', () => {
  test('default example: 100 mm 6061-T6, 20 °C → 77 K', async ({ page }) => {
    await page.goto('./#/thermal')
    // Independent benchmark TE-B3 scaled: ΔL = −389.034 µm, Lf = 99.6109655 mm
    await expect(page.getByTestId('change')).toContainText('-389.03')
    await expect(page.getByTestId('final-length')).toContainText('99.6109655')
    await expect(page.getByRole('list', { name: 'Limitations for this result' })).toContainText('Equation range 4–300 K (300 K = 26.85 °C = 80.33 °F)')
  })

  test('unit equivalence: inch/°F input gives the same change', async ({ page }) => {
    await page.goto('./#/thermal?method=model&model=nist-6061-t6-linear-expansion&L=3.937007874015748&LU=in&Ti=68&TiU=F&Tf=-321.07&TfU=F&outU=mm&dU=um')
    await expect(page.getByTestId('change')).toContainText('-389.03')
  })

  test('blocks temperatures outside the model range and shows no result', async ({ page }) => {
    await page.goto('./#/thermal')
    await page.getByLabel('Initial temperature', { exact: true }).fill('30')
    await expect(page.getByText(/outside the Aluminum 6061-T6 \(NIST\) equation range 4–300 K/).first()).toBeVisible()
    await expect(page.getByTestId('change')).toHaveCount(0)
  })

  test('rejects blank and non-numeric input', async ({ page }) => {
    await page.goto('./#/thermal')
    await page.getByLabel('Initial length', { exact: true }).fill('')
    await expect(page.getByText('Enter the initial length.').first()).toBeVisible()
    await page.getByLabel('Initial length', { exact: true }).fill('12abc')
    await expect(page.getByText('The initial length must be a number.').first()).toBeVisible()
  })

  test('constant CTE: hand-worked case 10 in, 13.1×10⁻⁶/°F, 68 → 32 °F = −0.004716 in', async ({ page }) => {
    await page.goto('./#/thermal')
    await page.getByLabel('Constant CTE').check()
    await page.getByLabel('CTE (user supplied)', { exact: true }).fill('13.1')
    await page.getByLabel('CTE (user supplied) unit').selectOption('ppm_per_F')
    await page.getByLabel('Initial length', { exact: true }).fill('10')
    await page.getByLabel('Initial length unit').selectOption('in')
    await page.getByLabel('Initial temperature', { exact: true }).fill('68')
    await page.getByLabel('Initial temperature unit').selectOption('F')
    await page.getByLabel('Final temperature', { exact: true }).fill('32')
    await page.getByLabel('Final temperature unit').selectOption('F')
    await page.getByLabel('Change unit').selectOption('in')
    await expect(page.getByTestId('change')).toContainText('-0.0047160')
  })

  test('URL state reproduces the calculation after reload; reset restores defaults', async ({ page }) => {
    await page.goto('./#/thermal')
    await page.getByLabel('Final temperature', { exact: true }).fill('4')
    await expect(page.getByTestId('change')).toContainText('-415.75')
    await expect(page).toHaveURL(/Tf=4&/)
    await page.reload()
    await expect(page.getByLabel('Final temperature', { exact: true })).toHaveValue('4')
    await expect(page.getByTestId('change')).toContainText('-415.75')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByTestId('change')).toContainText('-389.03')
  })

  test('warns when a link was made with a different dataset version', async ({ page }) => {
    await page.goto('./#/thermal?Tf=77&dv=2000.1.0')
    await expect(page.getByRole('alert').filter({ hasText: 'dataset 2000.1.0' })).toBeVisible()
  })

  test('shows a plot and the sources', async ({ page }) => {
    await page.goto('./#/thermal')
    await expect(page.getByRole('img', { name: /Part length versus temperature/ })).toBeVisible()
    await page.getByText('Model coverage and sources').click()
    await expect(page.getByRole('link', { name: /6061-T6 Aluminum \(UNS A96061\)/ })).toHaveAttribute('href', /trc\.nist\.gov/)
  })

  test('copy record puts a reproducible record on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('./#/thermal')
    await page.getByRole('button', { name: 'Copy record' }).click()
    await expect(page.getByText('Calculation record copied.')).toBeVisible()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('Calculation version: thermal-expansion@1.0.0')
    expect(text).toContain('Reproduce: http')
  })
})
