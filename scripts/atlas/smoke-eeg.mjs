// Config-getriebener EEG/ERP-Smoke. Source-Meshes kommen aus atlas-config.json,
// Topografie- und Quellenlabels aus der jeweiligen Scene-JSON.
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')
const config = JSON.parse(readFileSync(resolve(appRoot, 'public/assets/atlas-canonical/atlas-config.json'), 'utf8'))

function sceneJson(id) {
  const scene = JSON.parse(readFileSync(resolve(appRoot, `public/scenes/${id}.json`), 'utf8'))
  if (scene.id !== id) throw new Error(`smoke-eeg: ${id}.json enthaelt id "${scene.id}"`)
  return scene
}

function expectedMeshes(regions, context) {
  if (regions.length === 0) throw new Error(`smoke-eeg: Config "${context}" hat keine regions.scene_regions`)
  const meshes = [...new Set(regions.flatMap((region) => {
    const mapping = config.mesh_mappings.scene_regions[region]
    if (!mapping) throw new Error(`smoke-eeg: scene_region "${region}" fehlt in Runtime-Config`)
    if (mapping.meshes.length === 0) throw new Error(`smoke-eeg: scene_region "${region}" hat keine Geometrie`)
    return mapping.meshes
  }))]
  if (meshes.length === 0) throw new Error(`smoke-eeg: Config "${context}" loest keine Source-Meshes auf`)
  return meshes
}

const requested = (process.env.EEG_SMOKE_CONFIGS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
const erpConfigs = Object.entries(config.configurations)
  .filter(([name, cfg]) => {
    if (cfg.overlay?.kind !== 'erp' || !cfg.overlay.scene) return false
    return requested.length === 0 || requested.includes(name) || requested.includes(cfg.overlay.scene)
  })
  .map(([name, cfg]) => {
    const scene = sceneJson(cfg.overlay.scene)
    if (scene.overlay.kind !== 'erp') throw new Error(`smoke-eeg: Scene "${scene.id}" ist kein ERP-Overlay`)
    return {
      name,
      scene,
      meshes: expectedMeshes(cfg.regions?.scene_regions ?? [], name),
      source: scene.overlay.data?.source,
      site: scene.overlay.data?.site,
      component: scene.overlay.data?.component,
      region: scene.overlay.data?.topography?.region,
    }
  })

if (requested.length > 0 && erpConfigs.length !== requested.length) {
  throw new Error(`smoke-eeg: nicht alle angeforderten ERP-Configs gefunden (${requested.join(', ')})`)
}
if (erpConfigs.length === 0) throw new Error('smoke-eeg: keine ERP-Configs gefunden')

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => {
  pageErrors.push(e.message)
  console.log('  [pageerror]', e.message)
})
mkdirSync(resolve(here, 'work'), { recursive: true })

let fails = 0
const check = (cond, msg) => {
  if (!cond) {
    console.log('  FAIL:', msg)
    fails++
  } else {
    console.log('  ok:', msg)
  }
}

const formatList = (values) => values.length ? values.slice(0, 6).join(', ') + (values.length > 6 ? `, +${values.length - 6} weitere` : '') : 'keine'

async function waitBrain() {
  await page.waitForFunction(() => {
    const s = window.__THREE_SCENE__
    if (!s) return false
    let n = 0
    s.traverse((o) => { if (o.isMesh && o.name) n++ })
    return n > 100
  }, { timeout: 60000 })
}

const sampleSource = (names) => page.evaluate((expected) => {
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  const expectedSet = new Set(expected)
  const out = Object.fromEntries(expected.map((name) => [name, { visible: false, intensity: -1 }]))
  root.traverse((o) => {
    if (o.isMesh && expectedSet.has(o.name)) {
      const material = Array.isArray(o.material) ? o.material[0] : o.material
      const intensity = typeof material?.emissiveIntensity === 'number' ? material.emissiveIntensity : -1
      out[o.name] = {
        visible: out[o.name].visible || o.visible,
        intensity: Math.max(out[o.name].intensity, intensity),
      }
    }
  })
  return out
}, names)

function summarizeMeshSamples(mesh, samples) {
  const values = samples
    .map((sample) => sample[mesh]?.intensity ?? -1)
    .filter((value) => value >= 0)
  const min = values.length ? Math.min(...values) : -1
  const max = values.length ? Math.max(...values) : -1
  return {
    mesh,
    values,
    visibleInEverySample: samples.every((sample) => sample[mesh]?.visible === true),
    min,
    max,
    span: max - min,
  }
}

const cursorX = () => page.evaluate(() => {
  const c = [...document.querySelectorAll('circle')].find((el) => el.getAttribute('r') === '3.5')
  return c ? parseFloat(c.getAttribute('cx')) : null
})

for (const cfg of erpConfigs) {
  console.log(`\nERP ${cfg.scene.id} / config=${cfg.name}`)
  await page.goto(`${BASE}/?config=${cfg.name}&scene=${cfg.scene.id}&step=0`, { waitUntil: 'networkidle' })
  await waitBrain()
  await page.waitForTimeout(800)

  const samples = []
  for (let i = 0; i < 14; i++) {
    samples.push(await sampleSource(cfg.meshes))
    await page.waitForTimeout(220)
  }
  const meshStats = cfg.meshes.map((mesh) => summarizeMeshSamples(mesh, samples))
  console.log('  Source-Emissive je Mesh:', meshStats.map((stat) => (
    `${stat.mesh}:${stat.values.length ? `${stat.min.toFixed(2)}-${stat.max.toFixed(2)}` : 'fehlt'}`
  )).join(' '))
  const missing = meshStats.filter((stat) => stat.values.length === 0).map((stat) => stat.mesh)
  const hidden = meshStats.filter((stat) => !stat.visibleInEverySample).map((stat) => stat.mesh)
  const weakSpan = meshStats.filter((stat) => stat.values.length === 0 || stat.span <= 0.2).map((stat) => stat.mesh)
  const weakMax = meshStats.filter((stat) => stat.values.length === 0 || stat.max <= 0.7).map((stat) => stat.mesh)
  const weakMin = meshStats.filter((stat) => stat.values.length === 0 || stat.min >= 0.4).map((stat) => stat.mesh)
  const minSpan = Math.min(...meshStats.map((stat) => stat.span))
  const maxPeak = Math.max(...meshStats.map((stat) => stat.max))
  const minRest = Math.min(...meshStats.map((stat) => stat.min))
  check(missing.length === 0, `alle ${cfg.meshes.length} Config-Source-Meshes im Scene-Graph gefunden${missing.length ? `; fehlt: ${formatList(missing)}` : ''}`)
  check(hidden.length === 0, `alle ${cfg.meshes.length} Config-Source-Meshes sichtbar${hidden.length ? `; nicht sichtbar: ${formatList(hidden)}` : ''}`)
  check(weakSpan.length === 0, `alle Config-Source-Meshes pulsen (min. Spanne ${minSpan.toFixed(2)} > 0.2${weakSpan.length ? `; schwach: ${formatList(weakSpan)}` : ''})`)
  check(weakMax.length === 0, `alle Quellen erreichen Maximum am Peak (max ${maxPeak.toFixed(2)} > 0.7${weakMax.length ? `; schwach: ${formatList(weakMax)}` : ''})`)
  check(weakMin.length === 0, `alle Quellen fallen zwischen Peaks ab (min ${minRest.toFixed(2)} < 0.4${weakMin.length ? `; schwach: ${formatList(weakMin)}` : ''})`)

  const firstX = await cursorX()
  await page.waitForTimeout(500)
  const secondX = await cursorX()
  check(firstX !== null && secondX !== null && firstX !== secondX, `ERP-Cursor wandert (${firstX?.toFixed(0)} -> ${secondX?.toFixed(0)})`)

  const body = await page.locator('body').innerText()
  check(body.includes(`(${cfg.site})`), `Topografie nennt ${cfg.site}`)
  check(body.includes(`${cfg.component} · Topografie ${cfg.region}`), `Topografie unterscheidet ${cfg.component}/${cfg.region}`)
  check(body.includes(`Quelle: ${cfg.source}`), `Topografie nennt Quelle "${cfg.source}"`)
  check(body.includes('Schematisch/didaktisch'), 'Topografie markiert die Darstellung als schematisch')
  await page.screenshot({ path: resolve(here, `work/smoke-eeg-${cfg.scene.id}.png`) })
}

check(pageErrors.length === 0, `keine Browser-pageerror (${pageErrors.length ? pageErrors.join(' | ') : '0'})`)
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
