import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'
const ERP_PATH = '/?mode=learn&config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring'

const browser = await chromium.launch()
let failures = 0

async function run(id, viewport, hasTouch, check) {
  const context = await browser.newContext({ viewport, hasTouch })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}${ERP_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await page.locator('svg[aria-label^="ERP"]').first().waitFor({ state: 'visible', timeout: 60000 })
    await check(page, errors)
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
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${id} ${errors.join(' | ')}`)
}

try {
  // Desktop: ERP-Kurve in der einklappbaren Kontextspalte; Collapse blendet sie aus, Reopen wieder ein.
  await run('desktop-erp-collapsible', { width: 1440, height: 900 }, false, async (page, errors) => {
    const collapse = page.getByRole('button', { name: 'Kontextspalte einklappen' })
    if (await collapse.count() === 0) { errors.push('collapse-fehlt'); return }
    await collapse.first().click()
    await page.getByRole('button', { name: 'Kontextspalte einblenden' }).first().waitFor({ state: 'visible', timeout: 10000 })
    if (await page.locator('svg[aria-label^="ERP"]').count() > 0) errors.push('erp-nach-collapse-sichtbar')
  })

  // Phone Portrait: ERP liegt im Sheet/Drawer (kein Collapse-Streifen — Portrait klappt anders).
  await run('phone-portrait-erp-sheet', { width: 390, height: 844 }, true, async (page, errors) => {
    if (await page.getByRole('button', { name: 'Kontextspalte einklappen' }).count() > 0) {
      errors.push('collapse-streifen-unerwartet-portrait')
    }
  })
} finally {
  await browser.close()
}
if (failures) process.exit(1)
