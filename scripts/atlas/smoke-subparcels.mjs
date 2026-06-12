// Prueft, ob Sub-Patch-Meshes nach Scene-Load sichtbar sind und korrekte Namen haben.
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL || 'http://localhost:5174'
const TIMEOUT = 12000

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exitCode = 1 })

async function checkScene(sceneId, expectedMeshes) {
  await page.goto(`${BASE}/?scene=${sceneId}`, { waitUntil: 'networkidle', timeout: TIMEOUT })
  await page.waitForTimeout(2000)  // R3F-Render abwarten

  const result = await page.evaluate(({ expectedMeshes }) => {
    const brainScene = window.__THREE_SCENE__
    if (!brainScene) return { ok: false, reason: '__THREE_SCENE__ nicht gefunden' }
    // R3F root scene = parent des brain.glb-Objekts (enthaelt alle primitives inkl. SubParcels)
    const root = brainScene.parent || brainScene
    const visible = []
    const invisible = []
    root.traverse((o) => {
      if (o.isMesh && expectedMeshes.includes(o.name)) {
        if (o.visible) visible.push(o.name)
        else invisible.push(o.name)
      }
    })
    const missingNames = expectedMeshes.filter(n => !visible.includes(n))
    return { ok: missingNames.length === 0, visible, invisible, missingNames }
  }, { expectedMeshes })

  if (result.ok) {
    console.log(`✓ ${sceneId}: sichtbare Sub-Patches = [${result.visible.join(', ')}]`)
  } else {
    console.error(`✗ ${sceneId}: fehlende/unsichtbare Meshes = [${result.missingNames.join(', ')}]`)
    console.error(`  visible: ${result.visible}  notFound: ${result.notFound}`)
    process.exitCode = 1
  }
}

await checkScene('p3a-konfliktmonitoring', ['left-anterior-cingulate', 'right-anterior-cingulate'])
await checkScene('p3z-inhibition', ['left-sma', 'right-sma', 'left-pre-sma', 'right-pre-sma'])

await browser.close()
if (process.exitCode !== 1) console.log('\nSub-Parcel-Smoke: alle Checks gruen ✓')
