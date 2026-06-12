// Smoke W2-EEG: P3b voll-synchron. Die Quelle (Parietal-/Frontallappen) liegt in brain.glb
// (kein Sub-Patch) — die Brain-Komponente pulst die gehighlighteten Gyri jetzt mit der
// ERP-Huellkurve. Topografie nennt Pz (parieto-okzipital).
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

await page.goto(`${BASE}/?scene=p3b-engagement`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const s = window.__THREE_SCENE__; if (!s) return false
  let n = 0; s.traverse((o) => { if (o.isMesh && o.name) n++ }); return n > 100
}, { timeout: 60000 })
await page.getByText('Modus', { exact: false }).first().click()
await page.getByRole('button', { name: /Lernen/ }).click()
await page.waitForTimeout(800)

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

// Parietale Quelle (brain.glb): superior-parietal-lobule + supramarginal-gyrus.
const sample = () => page.evaluate(() => {
  let root = window.__THREE_SCENE__; while (root.parent) root = root.parent
  const names = ['left-superior-parietal-lobule', 'right-superior-parietal-lobule', 'left-supramarginal-gyrus', 'right-supramarginal-gyrus']
  let vis = false, intensity = -1
  root.traverse((o) => {
    if (o.isMesh && names.includes(o.name)) { if (o.visible) vis = true; intensity = Math.max(intensity, o.material.emissiveIntensity) }
  })
  return { vis, intensity }
})
const samples = []
for (let i = 0; i < 14; i++) { samples.push(await sample()); await page.waitForTimeout(220) }
const ints = samples.map((s) => s.intensity).filter((x) => x >= 0)
const min = Math.min(...ints), max = Math.max(...ints)
console.log('  Parietal-Quelle Emissive ueber Zeit:', ints.map((x) => x.toFixed(2)).join(' '))
check(samples.some((s) => s.vis), 'Parietal-Quelle sichtbar im P3b')
check(max - min > 0.2, `Quelle pulst (Spanne ${(max - min).toFixed(2)} > 0.2)`)
check(max > 0.7, `Quelle erreicht Maximum am Peak (max ${max.toFixed(2)})`)
check(min < 0.4, `Quelle faellt zwischen Peaks ab (min ${min.toFixed(2)})`)

// Topografie nennt Pz (parieto-okzipital), nicht Cz.
const topo = await page.locator('text=Topografie').first().innerText().catch(() => '')
check(/Pz/.test(topo), `Topografie nennt Pz ("${topo.trim()}")`)

await page.screenshot({ path: 'scripts/atlas/work/smoke-eeg-p3b.png' })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
