// Smoke W1-D: EEG voll-synchron (P3a). Prueft, dass die 3D-Quelle (anterior-cingulate)
// sichtbar ist und ihre Emissive-Intensitaet ueber die Zeit pulst (= Quelle folgt der
// ERP-Huellkurve), und dass der ERP-Cursor (oranger Punkt) wandert.
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

await page.goto(`${BASE}/?scene=p3a-konfliktmonitoring`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const s = window.__THREE_SCENE__
  if (!s) return false
  let n = 0
  s.traverse((o) => { if (o.isMesh && o.name) n++ })
  return n > 100
}, { timeout: 60000 })

// In den Lern-Modus wechseln -> LearnSidebar mountet, liest ?scene -> P3a, startet Animation.
await page.getByText('Modus', { exact: false }).first().click()
await page.getByRole('button', { name: /Lernen/ }).click()
await page.waitForTimeout(800)

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

// Emissive-Intensitaet der ACC-Quelle abtasten (mehrere Frames ueber ~2.6s Periode).
const sampleSource = () => page.evaluate(() => {
  // Sub-Patches liegen NICHT in __THREE_SCENE__ (= brain.glb), sondern als Geschwister
  // unter dem Canvas-Root. Bis zur Wurzel hochlaufen, dann alles traversieren.
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  let vis = false
  let intensity = -1
  root.traverse((o) => {
    if (o.isMesh && (o.name === 'left-anterior-cingulate' || o.name === 'right-anterior-cingulate')) {
      if (o.visible) vis = true
      intensity = Math.max(intensity, o.material.emissiveIntensity)
    }
  })
  return { vis, intensity }
})

const samples = []
for (let i = 0; i < 14; i++) {
  samples.push(await sampleSource())
  await page.waitForTimeout(220)
}
const visible = samples.some((s) => s.vis)
const intensities = samples.map((s) => s.intensity).filter((x) => x >= 0)
const min = Math.min(...intensities)
const max = Math.max(...intensities)
console.log('  ACC-Quelle Emissive ueber Zeit:', intensities.map((x) => x.toFixed(2)).join(' '))
check(visible, 'ACC-Quelle (anterior-cingulate) sichtbar im P3a')
check(max - min > 0.2, `Quelle pulst (Spanne ${(max - min).toFixed(2)} > 0.2)`)
check(max > 0.7, `Quelle erreicht Maximum am Peak (max ${max.toFixed(2)})`)
check(min < 0.4, `Quelle faellt zwischen Peaks ab (min ${min.toFixed(2)})`)

// ERP-Cursor (oranger Punkt) wandert.
const cursorX = () => page.evaluate(() => {
  const c = [...document.querySelectorAll('circle')].find((el) => el.getAttribute('r') === '3.5')
  return c ? parseFloat(c.getAttribute('cx')) : null
})
const x1 = await cursorX()
await page.waitForTimeout(500)
const x2 = await cursorX()
check(x1 !== null && x2 !== null && x1 !== x2, `ERP-Cursor wandert (${x1?.toFixed(0)} -> ${x2?.toFixed(0)})`)

await page.screenshot({ path: 'scripts/atlas/work/smoke-eeg.png' })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
