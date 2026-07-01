import { launchSmokeBrowser } from './smokeBrowser.mjs'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'
const SHOT_DIR = process.env.SHOT_DIR ?? '/tmp/shell-nav-shots'
mkdirSync(SHOT_DIR, { recursive: true })

const CASES = [
  { id: 'desktop-rail', path: '/?mode=learn&config=vcpt&scene=vcpt', viewport: { width: 1440, height: 900 }, hasTouch: false, expect: 'rail' },
  { id: 'phone-landscape-rail', path: '/?mode=learn&config=vcpt&scene=vcpt', viewport: { width: 844, height: 390 }, hasTouch: true, expect: 'rail' },
  { id: 'phone-portrait-dock', path: '/?mode=learn&config=vcpt&scene=vcpt', viewport: { width: 390, height: 844 }, hasTouch: true, expect: 'dock' },
]

const browser = await launchSmokeBrowser()
let failures = 0

try {
for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: testCase.viewport, hasTouch: testCase.hasTouch })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    const nav = page.locator(`nav[data-shell-nav="${testCase.expect}"]`)
    await nav.first().waitFor({ state: 'visible', timeout: 60000 })

    // Navigationsbuttons der Leiste: max 4 Aktionen + „Mehr" (Shape §Phone Portrait).
    const buttonCount = await nav.first().locator(':scope > button').count()
    if (buttonCount < 1) errors.push('keine-nav-buttons')
    if (buttonCount > 5) errors.push(`zu-viele-buttons=${buttonCount}`)

    // „Mehr" muss erreichbar sein und das Sheet (mit Einstellungen) oeffnen.
    const more = nav.first().getByRole('button', { name: /Mehr/ })
    if (await more.count() === 0) errors.push('mehr-fehlt')
    else {
      await more.first().click()
      await page.getByRole('dialog', { name: 'Mehr' }).waitFor({ state: 'visible', timeout: 10000 })
    }

    const overflowX = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )
    if (overflowX > 1) errors.push(`overflowX=${overflowX}`)

    await page.screenshot({ path: `${SHOT_DIR}/${testCase.id}.png`, fullPage: false })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    await context.close()
  }

  if (errors.length) failures++
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${testCase.id} ${errors.join(' | ')}`)
}
} finally {
  await browser.close()
}
if (failures) process.exit(1)
