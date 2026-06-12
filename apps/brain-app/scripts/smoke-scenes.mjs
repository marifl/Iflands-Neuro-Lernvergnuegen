// Temporaerer Smoke: prueft pro Szene, ob die korrekten Hirn-Meshes emissive (=leuchtend) sind
// und das richtige Overlay-DOM rendert. Programmatischer Ersatz fuer das visuelle "leuchtet korrekt".
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5175'
const BG = (...n) => n.flatMap((x) => [`left-${x}`, `right-${x}`])
const REGION = {
  'acc-cingulum': BG('cingulate-gyrus'),
  'parietal-frontal': BG('superior-parietal-lobule', 'supramarginal-gyrus', 'superior-frontal-gyrus'),
  'sma-presma': BG('superior-frontal-gyrus'),
  'inhibition-network': BG('superior-frontal-gyrus', 'cingulate-gyrus'),
}
const SCENES = [
  { id: 'go-nogo-intro', regions: ['inhibition-network'], kind: 'prose', needle: 'automatischer Reaktionen' },
  { id: 'vcpt', regions: ['sma-presma'], kind: 'flowchart', needle: 'Taste drücken' },
  { id: 'ica-uebersicht', regions: ['inhibition-network'], kind: 'flowchart', needle: 'Konfliktmonitoring' },
  { id: 'p3a-konfliktmonitoring', regions: ['acc-cingulum'], kind: 'erp', needle: 'Maximum über Cz' },
  { id: 'p3b-engagement', regions: ['parietal-frontal'], kind: 'erp', needle: 'Maximum über Pz' },
  { id: 'p3z-inhibition', regions: ['sma-presma'], kind: 'erp', needle: 'Maximum über Cz' },
  { id: 'zusammenfassung', regions: ['inhibition-network', 'acc-cingulum', 'parietal-frontal', 'sma-presma'], kind: 'prose', needle: 'exekutive Funktionen' },
]
const expectedMeshes = (regions) => [...new Set(regions.flatMap((r) => REGION[r]))]

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))
let fails = 0

async function waitBrain() {
  await page.waitForFunction(() => {
    const s = window.__THREE_SCENE__
    if (!s) return false
    let n = 0
    s.traverse((o) => { if (o.isMesh && o.name) n++ })
    return n > 100
  }, { timeout: 60000 })
}

// Liest die emissiven (leuchtenden) Mesh-Namen aus der three.js-Szene (SELECT_COLOR f26b1f, intensity 0.7).
const litMeshes = () => page.evaluate(() => {
  const out = []
  window.__THREE_SCENE__.traverse((o) => {
    if (o.isMesh && o.name && o.material && o.material.emissiveIntensity > 0.5) out.push(o.name)
  })
  return out
})

const camPos = () => page.evaluate(() => {
  const c = window.__CAMERA__
  return c ? [c.position.x, c.position.y, c.position.z] : null
})
const camById = {}

for (const sc of SCENES) {
  await page.goto(`${BASE}/?scene=${sc.id}`, { waitUntil: 'networkidle' })
  await waitBrain()
  // Auf Highlight-Anwendung warten (Effekt nach loadScenes + goto).
  const want = expectedMeshes(sc.regions)
  let lit = []
  for (let i = 0; i < 40; i++) {
    lit = await litMeshes()
    if (want.every((m) => lit.includes(m))) break
    await page.waitForTimeout(150)
  }
  // Kamera settlen lassen (Lerp), dann Position festhalten.
  await page.waitForTimeout(1200)
  camById[sc.id] = await camPos()
  const litSet = new Set(lit)
  const missing = want.filter((m) => !litSet.has(m))
  // DOM: Overlay-Renderer korrekt?
  const dom = await page.evaluate((needle) => {
    const body = document.body.innerText
    const polylines = document.querySelectorAll('svg polyline').length
    const jump = !!document.querySelector('[aria-label="Szene springen"]')
    return { hasNeedle: body.includes(needle), polylines, jump }
  }, sc.needle)
  const erpOk = sc.kind !== 'erp' || dom.polylines >= 2
  const ok = missing.length === 0 && dom.hasNeedle && erpOk && dom.jump
  if (!ok) fails++
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${sc.id.padEnd(24)} lit=${lit.length} missing=${missing.length ? missing.join(',') : '0'} needle=${dom.hasNeedle} polylines=${dom.polylines} chrome=${dom.jump}`,
  )
}

// Deep-Link C bereits oben getestet. Jetzt Explorer-Modus: KEIN Presenter-Chrome, Viewer da.
await page.goto(`${BASE}/?mode=explore`, { waitUntil: 'networkidle' })
await waitBrain()
const explore = await page.evaluate(() => ({
  jump: !!document.querySelector('[aria-label="Szene springen"]'),
  header: document.body.innerText.includes('BodyParts3D'),
}))
const exploreOk = !explore.jump && explore.header
if (!exploreOk) fails++
console.log(`${exploreOk ? 'PASS' : 'FAIL'} explore-mode            chrome=${explore.jump} (erwartet false) header=${explore.header}`)

// B2: Kamera framt unterschiedlich je Shot/Region. p3b (lateral-left, parietal) vs
// p3a (medial-midline, cingulum) muessen deutlich verschiedene Kamera-Positionen ergeben.
const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0)
const camMove = dist(camById['p3b-engagement'], camById['p3a-konfliktmonitoring'])
const camOk = !!camById['p3a-konfliktmonitoring'] && camMove > 5
if (!camOk) fails++
console.log(`${camOk ? 'PASS' : 'FAIL'} camera-framing         |p3b-p3a|=${camMove.toFixed(1)} (erwartet >5)`)

await browser.close()
console.log(fails === 0 ? '\nALLE SMOKES GRÜN' : `\n${fails} SMOKE-FAILURES`)
process.exit(fails === 0 ? 0 : 1)
