import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const CASES = [
  {
    id: 'desktop-explorer-panel',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
    openDrawer: false,
  },
  {
    id: 'phone-portrait-explorer-drawer',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    openDrawer: true,
  },
  {
    id: 'phone-landscape-explorer-rail',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    openDrawer: false,
  },
]

const browser = await chromium.launch()
let failures = 0

for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    hasTouch: testCase.hasTouch,
  })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })

    if (testCase.openDrawer) {
      await page.getByRole('button', { name: 'Strukturbaum öffnen' }).click()
      await page.waitForSelector('[data-testid="mobile-structure-drawer"]', { timeout: 10000 })
    } else {
      await page.waitForSelector('[data-testid="structure-tree-panel"]', { timeout: 60000 })
    }

    const panel = testCase.openDrawer
      ? page.getByTestId('mobile-structure-drawer')
      : page.getByTestId('structure-tree-panel')

    await panel.getByPlaceholder('Struktur suchen…').waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Roh-Atlas-Overlay' }).waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Carve-Atlas-Overlay' }).waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Schnitte' }).waitFor({ timeout: 10000 })

    const disabledSelection = panel.getByRole('button', { name: 'Auswahl ausblenden' }).first()
    const ariaDisabled = await disabledSelection.getAttribute('aria-disabled')
    if (ariaDisabled !== 'true') errors.push(`selection-aria-disabled=${ariaDisabled}`)
    const nativeDisabled = await disabledSelection.evaluate((button) => button instanceof HTMLButtonElement && button.disabled)
    if (nativeDisabled) errors.push('selection-native-disabled')
    const disabledReason = await panel.getByText('Erst eine Struktur auswählen').first().isVisible()
    if (!disabledReason) errors.push('selection-disabled-reason-fehlt')

    const sagittal = panel.getByRole('button', { name: 'Sagittal' })
    const cutAxis = await sagittal.getAttribute('data-cut-axis')
    if (cutAxis !== 'sagittal') errors.push(`cut-axis=${cutAxis}`)

    await sagittal.click()
    await panel.getByLabel('Schnittposition Sagittal').waitFor({ timeout: 10000 })

    const overflowX = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )
    if (overflowX > 1) errors.push(`overflowX=${overflowX}`)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    await context.close()
  }

  if (errors.length) failures++
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${testCase.id} ${errors.join(' | ')}`)
}

await browser.close()
if (failures) process.exit(1)
