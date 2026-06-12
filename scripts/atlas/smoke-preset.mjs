// Smoke: aktiviert das Figur-Preset "PFC Petrides" und prueft, ob die Brain-Meshes
// die didaktischen Gruppen-Farben tragen (DLPFC != VLPFC, nicht-gruppierte gedimmt).
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

await page.goto(`${BASE}/?mode=explore`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const s = window.__THREE_SCENE__
  if (!s) return false
  let n = 0
  s.traverse((o) => { if (o.isMesh && o.name) n++ })
  return n > 100
}, { timeout: 60000 })

// Farbe-Flyout oeffnen + PFC Petrides aktivieren.
await page.getByText('Farbe', { exact: false }).first().click()
await page.getByText(/PFC Petrides/).click()
await page.waitForTimeout(400)

const colors = await page.evaluate(() => {
  // W1-B: VLPFC faerbt sub-gyral ueber die pars-Sub-Patches (SubParcels-GLB liegt als
  // Geschwister neben __THREE_SCENE__) -> vom Wurzelknoten traversieren.
  const want = ['left-middle-frontal-gyrus', 'right-superior-frontal-gyrus', 'left-parsopercularis', 'left-precuneus', 'left-amygdala']
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  const out = {}
  root.traverse((o) => {
    if (o.isMesh && want.includes(o.name) && o.visible) out[o.name] = '#' + o.material.color.getHexString()
  })
  return out
})

console.log('Mesh-Farben nach Preset PFC Petrides:')
for (const [k, v] of Object.entries(colors)) console.log('  ', k.padEnd(28), v)

const dlpfc = colors['left-middle-frontal-gyrus']
const sfg = colors['right-superior-frontal-gyrus']
const vlpfc = colors['left-parsopercularis']
const posterior = colors['left-precuneus']
const ungrouped = colors['left-amygdala']

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }
check(dlpfc && dlpfc === sfg, 'DLPFC-Gruppe (MFG=SFG) gleiche Farbe')
check(dlpfc && vlpfc && dlpfc !== vlpfc, 'DLPFC != VLPFC (distinkte Gruppen)')
check(posterior && posterior !== dlpfc && posterior !== vlpfc, 'Posterior-Gruppe eigene Farbe')
check(ungrouped && ungrouped !== dlpfc && ungrouped !== vlpfc && ungrouped !== posterior, 'nicht-gruppiert (Amygdala) gedimmt/abweichend')

await page.screenshot({ path: 'scripts/atlas/work/smoke-preset-petrides.png' })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
