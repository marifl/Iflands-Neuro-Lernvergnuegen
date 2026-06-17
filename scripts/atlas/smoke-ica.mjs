// Browser-Smoke fuer die schematische ICA-Zerlegung im Vortragspfad.
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

await page.goto(`${BASE}/?config=ica-uebersicht&scene=ica-uebersicht&step=0`, { waitUntil: 'networkidle' })
await page.waitForSelector('svg[aria-label="ICA-Komponententrennung"]', { timeout: 30000 })
const body = await page.locator('body').innerText()
check(body.includes('Gemischtes VCPT-ERP'), 'zeigt gemischtes Signal')
check(body.includes('P3a') && body.includes('P3b') && body.includes('P3z'), 'zeigt alle drei ICA-Komponenten')
check(body.includes('Konfliktmonitoring') && body.includes('Engagement') && body.includes('Inhibition'), 'zeigt Komponentenfunktionen')
check(body.includes('Schematisch/didaktisch'), 'kennzeichnet die Darstellung als schematisch')

const pauseButton = page.getByLabel('ICA-Animation pausieren')
await pauseButton.click()
check(await page.getByLabel('ICA-Animation abspielen').count() === 1, 'Animation ist pausierbar')
await page.getByLabel('ICA-Animation zurücksetzen').click()
check(await page.getByLabel('ICA-Animation abspielen').count() === 1, 'Reset haelt Animation im pausierten Zustand')
await page.screenshot({ path: resolve(here, 'work/smoke-ica.png') })

check(pageErrors.length === 0, `keine Browser-pageerror (${pageErrors.length ? pageErrors.join(' | ') : '0'})`)
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
