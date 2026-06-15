// Prueft, ob die in atlas-config.json referenzierten Scene-Region-Meshes sichtbar sind.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL || 'http://localhost:5174'
const TIMEOUT = 12000
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')
const config = JSON.parse(readFileSync(resolve(appRoot, 'public/assets/atlas-canonical/atlas-config.json'), 'utf8'))

function expectedMeshes(regions) {
  return [...new Set(regions.flatMap((region) => {
    const mapping = config.mesh_mappings.scene_regions[region]
    if (!mapping) throw new Error(`smoke-subparcels: scene_region "${region}" fehlt in Runtime-Config`)
    if (mapping.meshes.length === 0) throw new Error(`smoke-subparcels: scene_region "${region}" hat keine Geometrie`)
    return mapping.meshes
  }))]
}

const scenes = Object.entries(config.configurations)
  .filter(([, cfg]) => cfg.overlay?.scene && cfg.regions?.scene_regions?.length)
  .map(([configName, cfg]) => ({
    configName,
    sceneId: cfg.overlay.scene,
    meshes: expectedMeshes(cfg.regions.scene_regions),
  }))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exitCode = 1 })

async function checkScene(scene) {
  await page.goto(`${BASE}/?scene=${scene.sceneId}`, { waitUntil: 'networkidle', timeout: TIMEOUT })
  await page.waitForTimeout(2000)  // R3F-Render abwarten

  const result = await page.evaluate(({ expected }) => {
    const brainScene = window.__THREE_SCENE__
    if (!brainScene) return { ok: false, reason: '__THREE_SCENE__ nicht gefunden' }
    let root = brainScene
    while (root.parent) root = root.parent
    const visible = []
    const invisible = []
    root.traverse((o) => {
      if (o.isMesh && expected.includes(o.name)) {
        if (o.visible) visible.push(o.name)
        else invisible.push(o.name)
      }
    })
    const missingNames = expected.filter((name) => !visible.includes(name))
    return { ok: missingNames.length === 0, visible, invisible, missingNames }
  }, { expected: scene.meshes })

  if (result.ok) {
    console.log(`✓ ${scene.sceneId}: config=${scene.configName} sichtbare Meshes = [${result.visible.join(', ')}]`)
  } else {
    console.error(`✗ ${scene.sceneId}: config=${scene.configName} fehlende/unsichtbare Meshes = [${result.missingNames.join(', ')}]`)
    console.error(`  visible: ${result.visible}  invisible: ${result.invisible}`)
    process.exitCode = 1
  }
}

for (const scene of scenes) await checkScene(scene)

await browser.close()
if (process.exitCode !== 1) console.log('\nSub-Parcel-Smoke: alle Checks gruen ✓')
