import { launchSmokeBrowser } from './smokeBrowser.mjs'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const browser = await launchSmokeBrowser()
let failures = 0

async function run(id, sceneConfig, expectBridge) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: false })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}/?mode=learn&config=${sceneConfig}&scene=${sceneConfig}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await page.waitForSelector('[aria-label="Szene springen"]', { timeout: 60000 })
    const bridge = page.getByRole('button', { name: /Im Atlas zeigen/ })
    const present = await bridge.count() > 0
    if (expectBridge && !present) errors.push('bridge-fehlt')
    if (!expectBridge && present) errors.push('bridge-unerwartet')

    if (expectBridge && present) {
      await bridge.first().click()
      await page.waitForURL(/[?&]mode=atlas/, { timeout: 10000 })
      const url = page.url()
      if (!url.includes('atlasLayer=') || !url.includes('atlasArea=')) errors.push('atlas-fokus-url-fehlt')
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    await context.close()
  }
  if (errors.length) failures++
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${id} ${errors.join(' | ')}`)
}

try {
  // pfc-petrides: kuratierte PFC-Region -> Bruecke vorhanden + oeffnet den Atlas-Modus.
  // (Die meisten Kapitel-11-Lernszenen sind kortikal und bruecken; ein verlaesslicher
  //  Negativ-Fall existiert in der Lernsequenz kaum — die Kuratierung sichert atlasBridge.ts ab.)
  await run('learn-to-atlas-bridge', 'pfc-petrides', true)
} finally {
  await browser.close()
}
if (failures) process.exit(1)
