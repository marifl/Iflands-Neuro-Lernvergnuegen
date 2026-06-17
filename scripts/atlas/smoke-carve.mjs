// Smoke W1-B: Carve-Geometrie. Prueft, dass ein DKT-Sub-Patch (left-parsopercularis) als
// echtes Teilstueck des IFG sitzt — sichtbar im Preset, mit Geometrie, polygonOffset gegen
// Z-Fighting, und sein Schwerpunkt liegt innerhalb der IFG-Bounding-Box (kein Versatz).
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')
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

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

// PFC Petrides aktivieren -> vlpfc-Sub-Patches (pars*) werden sichtbar.
await page.getByText('Farbe', { exact: false }).first().click()
await page.getByText(/PFC Petrides/).click()
await page.waitForTimeout(400)

const info = await page.evaluate(() => {
  const THREE = window.__THREE__
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  const get = (name) => {
    let m = null
    root.traverse((o) => { if (o.isMesh && o.name === name) m = o })
    return m
  }
  const bboxCenter = (m) => {
    m.geometry.computeBoundingBox()
    const c = new THREE.Vector3()
    m.geometry.boundingBox.getCenter(c)
    return m.localToWorld(c)
  }
  const bboxOf = (m) => {
    m.geometry.computeBoundingBox()
    return { min: m.geometry.boundingBox.min.toArray(), max: m.geometry.boundingBox.max.toArray() }
  }
  const pars = get('left-parsopercularis')
  const ifg = get('left-inferior-frontal-gyrus')
  if (!pars || !ifg) return { error: `pars=${!!pars} ifg=${!!ifg}` }
  const pc = bboxCenter(pars)
  const ib = bboxOf(ifg)
  // pars-Center liegt innerhalb der IFG-Bounding-Box (gleicher Raum, Teil des Gyrus)?
  const inside =
    pc.x >= ib.min[0] - 2 && pc.x <= ib.max[0] + 2 &&
    pc.y >= ib.min[1] - 2 && pc.y <= ib.max[1] + 2 &&
    pc.z >= ib.min[2] - 2 && pc.z <= ib.max[2] + 2
  return {
    visible: pars.visible,
    faces: pars.geometry.index ? pars.geometry.index.count / 3 : 0,
    polygonOffset: pars.material.polygonOffset === true,
    offsetFactor: pars.material.polygonOffsetFactor,
    inside,
  }
})

if (info.error) {
  console.log('  FAIL: Meshes nicht gefunden:', info.error)
  fails++
} else {
  console.log('  parsopercularis:', JSON.stringify(info))
  check(info.visible, 'Sub-Patch left-parsopercularis sichtbar im Preset')
  check(info.faces > 100, `Sub-Patch hat echte Geometrie (${info.faces} Faces)`)
  check(info.polygonOffset && info.offsetFactor < 0, 'polygonOffset aktiv (kein Z-Fighting mit IFG)')
  check(info.inside, 'Sub-Patch sitzt innerhalb der IFG-Bounding-Box (Teil des Gyrus, kein Versatz)')
}

await page.screenshot({ path: resolve(here, 'work/smoke-carve.png') })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
