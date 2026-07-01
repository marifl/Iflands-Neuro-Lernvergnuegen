import { launchSmokeBrowser } from './smokeBrowser.mjs'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'
const START = '/?mode=learn&config=basalganglienschleifen&scene=basalganglienschleifen'

const browser = await launchSmokeBrowser()
let failures = 0
const errors = []

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: false })
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}${START}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await page.waitForSelector('[aria-label="Szene springen"]', { timeout: 60000 })

    // Praesentationszustand ueber "Mehr" erreichbar (kein eigener AppMode-Silo).
    await page.getByRole('button', { name: /Mehr/ }).first().click()
    await page.getByRole('dialog', { name: 'Mehr' }).waitFor({ state: 'visible', timeout: 10000 })
    await page.getByRole('button', { name: /Vortrag starten/ }).click()

    // Speaker-Notes + Rueckweg sichtbar, Step-State zeigt "Vortrag".
    await page.getByText('Sprechernotiz').first().waitFor({ state: 'visible', timeout: 60000 })
    const overflowX = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )
    if (overflowX > 1) errors.push(`overflowX=${overflowX}`)

    // Rueckweg fuehrt zurueck in den Lernpfad (Sprechernotiz verschwindet).
    const leave = page.getByRole('button', { name: /Vortrag verlassen/ })
    if (await leave.count() === 0) {
      errors.push('rueckweg-fehlt')
    } else {
      await leave.first().click()
      await page.waitForTimeout(1500)
      if (await page.getByText('Sprechernotiz').count() > 0) errors.push('sprechernotiz-nach-rueckweg-sichtbar')
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    await context.close()
  }
} finally {
  await browser.close()
}

if (errors.length) failures++
console.log(`${errors.length ? 'FAIL' : 'PASS'} presenter-state ${errors.join(' | ')}`)
if (failures) process.exit(1)
