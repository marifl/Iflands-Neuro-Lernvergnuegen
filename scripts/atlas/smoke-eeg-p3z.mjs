// Smoke W2-EEG: P3z voll-synchron. Quelle (SMA/pre-SMA, Sub-Patches) pulst zur ERP-Huellkurve,
// Cursor wandert, Topografie nennt die SMA-Quelle (nicht ACC).
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

await page.goto(`${BASE}/?scene=p3z-inhibition`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const s = window.__THREE_SCENE__; if (!s) return false
  let n = 0; s.traverse((o) => { if (o.isMesh && o.name) n++ }); return n > 100
}, { timeout: 60000 })
await page.getByText('Modus', { exact: false }).first().click()
await page.getByRole('button', { name: /Lernen/ }).click()
await page.waitForTimeout(800)

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

const sample = () => page.evaluate(() => {
  let root = window.__THREE_SCENE__; while (root.parent) root = root.parent
  const names = ['left-sma', 'right-sma', 'left-pre-sma', 'right-pre-sma']
  let vis = false, intensity = -1
  root.traverse((o) => { if (o.isMesh && names.includes(o.name)) { if (o.visible) vis = true; intensity = Math.max(intensity, o.material.emissiveIntensity) } })
  return { vis, intensity }
})
const samples = []
for (let i = 0; i < 14; i++) { samples.push(await sample()); await page.waitForTimeout(220) }
const ints = samples.map((s) => s.intensity).filter((x) => x >= 0)
const min = Math.min(...ints), max = Math.max(...ints)
console.log('  SMA-Quelle Emissive ueber Zeit:', ints.map((x) => x.toFixed(2)).join(' '))
check(samples.some((s) => s.vis), 'SMA/pre-SMA-Quelle sichtbar im P3z')
check(max - min > 0.2, `Quelle pulst (Spanne ${(max - min).toFixed(2)} > 0.2)`)
check(max > 0.7, `Quelle erreicht Maximum am Peak (max ${max.toFixed(2)})`)
check(min < 0.4, `Quelle faellt zwischen Peaks ab (min ${min.toFixed(2)})`)

// Topografie nennt die SMA-Quelle (nicht den ACC-Default).
const topo = await page.locator('text=Quelle:').first().innerText().catch(() => '')
check(/SMA/.test(topo) && !/Cingulum/.test(topo), `Topografie nennt SMA-Quelle ("${topo.trim()}")`)

await page.screenshot({ path: 'scripts/atlas/work/smoke-eeg-p3z.png' })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
