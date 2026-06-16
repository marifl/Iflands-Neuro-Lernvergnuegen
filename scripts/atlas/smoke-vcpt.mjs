// Browser-Smoke fuer die pausierbare VCPT-Stimulusfolge.
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173'
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (error) => {
  pageErrors.push(error.message)
  console.log('  [pageerror]', error.message)
})
mkdirSync(resolve(here, 'work'), { recursive: true })

let fails = 0
const check = (condition, message) => {
  if (!condition) {
    console.log('  FAIL:', message)
    fails++
  } else {
    console.log('  ok:', message)
  }
}

await page.goto(`${BASE}/?config=vcpt&scene=vcpt&step=0`, { waitUntil: 'networkidle' })
await page.waitForSelector('[aria-label="VCPT-Stimulusfolge"]', { timeout: 30000 })
const body = await page.locator('body').innerText()
check(body.includes('Cue') && body.includes('Probe'), 'zeigt Cue und Probe')
check(body.includes('Go') && body.includes('No-go'), 'zeigt Go- und No-go-Zustand')
check(body.includes('Kommissionsfehler') && body.includes('Auslassungsfehler'), 'zeigt Fehlerzustaende')
check(body.includes('Schematisch/didaktisch'), 'kennzeichnet die Darstellung als schematisch')

await page.getByLabel('VCPT-Animation pausieren').click()
check(await page.getByLabel('VCPT-Animation abspielen').count() === 1, 'Animation ist pausierbar')
await page.getByLabel('VCPT-Stimulus wählen').fill('2')
check((await page.locator('body').innerText()).includes('Kommissionsfehler'), 'Slider springt zu Kommissionsfehler')
await page.getByLabel('VCPT-Animation zurücksetzen').click()
check(await page.getByLabel('VCPT-Animation abspielen').count() === 1, 'Reset haelt Animation im pausierten Zustand')
await page.screenshot({ path: resolve(here, 'work/smoke-vcpt.png') })

check(pageErrors.length === 0, `keine Browser-pageerror (${pageErrors.length ? pageErrors.join(' | ') : '0'})`)
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
