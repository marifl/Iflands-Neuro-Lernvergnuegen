import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const CASES = [
  {
    id: 'phone-portrait-basalganglia',
    path: '/?mode=learn&config=basalganglienschleifen&scene=basalganglienschleifen',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  {
    id: 'desktop-basalganglia',
    path: '/?mode=learn&config=basalganglienschleifen&scene=basalganglienschleifen',
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
  },
  {
    id: 'phone-landscape-basalganglia',
    path: '/?mode=learn&config=basalganglienschleifen&scene=basalganglienschleifen',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
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
    await page.waitForSelector('[aria-label="Szene springen"]', { timeout: 60000 })

    const stepPickerTag = await page.locator('[aria-label="Szene springen"]').evaluate((el) => el.tagName)
    if (stepPickerTag !== 'INPUT') errors.push(`step-picker=${stepPickerTag}`)

    const legendControls = await page
      .getByRole('button', { name: /Legende (erweitern|minimieren|verbergen|anzeigen)/ })
      .count()
    if (legendControls > 0) errors.push(`learn-viewport-legends=${legendControls}`)

    const navBox = await page.getByLabel('Szene springen').boundingBox()
    const prevBox = await page.getByLabel('Vorige Szene').boundingBox()
    const nextBox = await page.getByLabel('Nächste Szene').boundingBox()
    const progressBox = await page.getByRole('progressbar').boundingBox()
    if (!navBox || navBox.width < 120 || navBox.height < 24) errors.push('step-picker-unbrauchbar')
    if (!prevBox || !nextBox || !progressBox) errors.push('nav-controls-fehlen')

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
