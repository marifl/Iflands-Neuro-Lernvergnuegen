// Smoke FP (P4): frontopolar (BA10) schaltet Badre 11-07 frei. Der Bucket muss
// auf die kanonischen frontopolar-Meshes zeigen. Prueft, dass das Preset aktivierbar ist,
// der Sub-Patch sichtbar + gefaerbt ist und als anteriore Frontalpol-Kappe sitzt.
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
  const s = window.__THREE_SCENE__; if (!s) return false
  let n = 0; s.traverse((o) => { if (o.isMesh && o.name) n++ }); return n > 100
}, { timeout: 60000 })

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

// Badre 11-07 (nutzt frontopolar) war wegen Geometrie-Luecke deaktiviert -> jetzt aktivierbar.
await page.getByText('Farbe', { exact: false }).first().click()
await page.waitForTimeout(150)
const badre = page.getByRole('button', { name: /Rostro-kaudaler Gradient/ })
const disabled = await badre.isDisabled().catch(() => true)
check(!disabled, '11-07 Badre freigeschaltet (frontopolar geschlossen)')
await badre.click()
await page.waitForTimeout(350)

const info = await page.evaluate(() => {
  const THREE = window.__THREE__
  let root = window.__THREE_SCENE__; while (root.parent) root = root.parent
  let fp = null, sfg = null
  root.traverse((o) => {
    if (o.isMesh && o.name === 'left-frontopolar') fp = o
    if (o.isMesh && o.name === 'left-superior-frontal-gyrus') sfg = o
  })
  if (!fp || !sfg) return { error: `fp=${!!fp} sfg=${!!sfg}` }
  fp.geometry.computeBoundingBox(); sfg.geometry.computeBoundingBox()
  const fpc = new THREE.Vector3(); fp.geometry.boundingBox.getCenter(fpc); fp.localToWorld(fpc)
  // Frontalpol = anteriorste Spitze -> fp-Center muss klar anteriorer (groesseres Z) als der
  // SFG-Gesamtschwerpunkt sein.
  const sfgc = new THREE.Vector3(); sfg.geometry.boundingBox.getCenter(sfgc); sfg.localToWorld(sfgc)
  return {
    visible: fp.visible,
    color: '#' + fp.material.color.getHexString(),
    faces: fp.geometry.index ? fp.geometry.index.count / 3 : 0,
    polygonOffset: fp.material.polygonOffset === true,
    fpZ: +fpc.z.toFixed(1), sfgZ: +sfgc.z.toFixed(1),
    anterior: fpc.z > sfgc.z,
  }
})

if (info.error) { console.log('  FAIL:', info.error); fails++ } else {
  console.log('  frontopolar:', JSON.stringify(info))
  check(info.visible, 'frontopolar sichtbar im Preset')
  check(info.color !== '#cdbfb6' && info.color !== '#3a3631', `frontopolar gefaerbt (${info.color})`)
  check(info.faces > 100, `frontopolar hat Geometrie (${info.faces} Faces)`)
  check(info.polygonOffset, 'polygonOffset aktiv (kein Z-Fighting)')
  check(info.anterior, `frontopolar sitzt anterior (Pol-Z ${info.fpZ} > SFG-Z ${info.sfgZ})`)
}

await page.screenshot({ path: resolve(here, 'work/smoke-frontopolar.png') })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
