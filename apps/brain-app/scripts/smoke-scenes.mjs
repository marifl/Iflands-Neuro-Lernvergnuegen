// Temporaerer Smoke: prueft pro Szene, ob die korrekten Hirn-Meshes emissive (=leuchtend) sind
// und das richtige Overlay-DOM rendert. Programmatischer Ersatz fuer das visuelle "leuchtet korrekt".
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5175'
const here = dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(readFileSync(resolve(here, '../public/assets/atlas-canonical/atlas-config.json'), 'utf8'))
const CAMERA_FIELDS = ['target', 'shot', 'fit', 'bounds', 'margin', 'fov', 'pose']

const sceneJson = (id) => {
  const scene = JSON.parse(readFileSync(resolve(here, `../public/scenes/${id}.json`), 'utf8'))
  if (scene.id !== id) throw new Error(`smoke-scenes: ${id}.json enthaelt id "${scene.id}"`)
  return scene
}

const sequence = config.learning['kapitel11-pfad'].steps
const SCENES = sequence.map((step) => {
  const cfg = config.configurations[step]
  const id = cfg.overlay?.scene
  if (!id) throw new Error(`smoke-scenes: Config-Step "${step}" hat kein overlay.scene`)
  const scene = sceneJson(id)
  if (cfg.overlay?.kind && cfg.overlay.kind !== scene.overlay.kind) {
    throw new Error(`smoke-scenes: Config-Step "${step}" overlay.kind "${cfg.overlay.kind}" passt nicht zu Scene "${scene.overlay.kind}"`)
  }
  return {
    id,
    configName: step,
    camera: cfg.camera,
    regions: cfg.regions?.scene_regions ?? [],
    kind: cfg.overlay?.kind,
    title: scene.title,
    expectedPolylines: scene.overlay.kind === 'erp' ? scene.overlay.data?.series?.length ?? 0 : 0,
  }
})
const expectedMeshes = (regions) => [...new Set(regions.flatMap((region) => {
  const mapping = config.mesh_mappings.scene_regions[region]
  if (!mapping) throw new Error(`smoke-scenes: scene_region "${region}" fehlt in mesh_mappings`)
  if (mapping.meshes.length === 0) throw new Error(`smoke-scenes: scene_region "${region}" hat keine Geometrie`)
  return mapping.meshes
}))]

const vecDist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity)
const stable = (value) => JSON.stringify(value ?? null)
const cameraConfigMatches = (expected = {}, actual = {}) =>
  CAMERA_FIELDS.every((field) => stable(expected[field]) === stable(actual[field]))
const expectedFit = (camera = {}) => (camera.pose ? 'pose' : camera.fit ?? 'bounds')

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => {
  pageErrors.push(e.message)
  console.log('  [pageerror]', e.message)
})
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
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  root.traverse((o) => {
    if (o.isMesh && o.name && o.material && o.material.emissiveIntensity > 0.5) out.push(o.name)
  })
  return out
})

const camPos = () => page.evaluate(() => {
  const c = window.__CAMERA__
  return c ? [c.position.x, c.position.y, c.position.z] : null
})
const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0)
const cameraState = () => page.evaluate(() => {
  const c = window.__CAMERA__
  const controls = window.__CAMERA_CONTROLS__
  if (!c) return null
  return {
    position: [c.position.x, c.position.y, c.position.z],
    target: controls?.target ? [controls.target.x, controls.target.y, controls.target.z] : null,
    fov: c.fov,
  }
})
const cameraRigDebug = () => page.evaluate(() => window.__CAMERA_RIG__ ?? null)
const assessCameraContract = (sc, actual, debug) => {
  const errors = []
  if (!actual) errors.push('camera fehlt')
  if (!actual?.target) errors.push('controls.target fehlt')
  if (!debug) errors.push('camera-rig-debug fehlt')
  if (!debug?.resolved) errors.push('resolved-debug fehlt')
  if (!debug) {
    return { ok: false, errors, positionDelta: Infinity, targetDelta: Infinity, fovDelta: Infinity, fit: 'n/a' }
  }

  if (debug.source !== 'figure') errors.push(`source=${debug.source}`)
  if (debug.activeConfiguration !== sc.configName) errors.push(`activeConfiguration=${debug.activeConfiguration}`)
  if (!cameraConfigMatches(sc.camera ?? {}, debug.config ?? {})) errors.push('config-mismatch')

  const fit = expectedFit(sc.camera)
  if (debug.resolved?.fit !== fit) errors.push(`fit=${debug.resolved?.fit}`)
  if (sc.camera?.margin !== undefined && Math.abs((debug.resolved?.margin ?? NaN) - sc.camera.margin) > 0.001) {
    errors.push(`margin=${debug.resolved?.margin}`)
  }
  if (sc.camera?.fov !== undefined && Math.abs((debug.resolved?.fov ?? NaN) - sc.camera.fov) > 0.1) {
    errors.push(`fov=${debug.resolved?.fov}`)
  }
  if (sc.camera?.fit === 'target') {
    const targetMeshes = debug.targetMeshes ?? debug.figureTargetMeshes
    if (!debug.targetBounds) errors.push('targetBounds-fehlt')
    if (!targetMeshes?.length) errors.push('targetMeshes-fehlen')
    if (debug.targetBounds && vecDist(debug.resolved?.target, debug.targetBounds.center) > 0.001) {
      errors.push('targetBounds-nicht-verwendet')
    }
  } else if (!sc.camera?.pose && debug.bounds && vecDist(debug.resolved?.target, debug.bounds.center) > 0.001) {
    errors.push('bounds-nicht-verwendet')
  }
  if (sc.camera?.pose) {
    if (vecDist(debug.resolved?.position, sc.camera.pose.position) > 0.001) errors.push('pose-position-nicht-verwendet')
    if (vecDist(debug.resolved?.target, sc.camera.pose.look_at) > 0.001) errors.push('pose-target-nicht-verwendet')
  }

  const positionDelta = vecDist(actual?.position, debug.resolved?.position)
  const targetDelta = vecDist(actual?.target, debug.resolved?.target)
  const fovDelta = actual?.fov === undefined ? Infinity : Math.abs(actual.fov - debug.resolved?.fov)
  if (positionDelta >= 2) errors.push(`positionDelta=${positionDelta.toFixed(1)}`)
  if (targetDelta >= 2) errors.push(`targetDelta=${targetDelta.toFixed(1)}`)
  if (fovDelta >= 0.1) errors.push(`fovDelta=${fovDelta.toFixed(1)}`)

  return { ok: errors.length === 0, errors, positionDelta, targetDelta, fovDelta, fit }
}
const waitCameraMatchesConfig = async (sc) => {
  let last = null
  let debug = null
  let assessment = null
  for (let i = 0; i < 60; i++) {
    last = await cameraState()
    debug = await cameraRigDebug()
    assessment = assessCameraContract(sc, last, debug)
    if (assessment.ok) return { ...assessment, debug, actual: last }
    await page.waitForTimeout(150)
  }
  return { ...(assessment ?? assessCameraContract(sc, last, debug)), debug, actual: last }
}
const visibleNamedMeshCount = () => page.evaluate(() => {
  let count = 0
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  root.traverse((o) => { if (o.isMesh && o.name && o.visible) count++ })
  return count
})
const camById = {}
const visibleById = {}

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
  // Kamera settlen lassen (Lerp), dann gegen Runtime-Config pruefen.
  const cameraCheck = await waitCameraMatchesConfig(sc)
  camById[sc.id] = await camPos()
  visibleById[sc.id] = await visibleNamedMeshCount()
  const litSet = new Set(lit)
  const missing = want.filter((m) => !litSet.has(m))
  // DOM: Overlay-Renderer korrekt?
  const dom = await page.evaluate((expected) => {
    const body = document.body.innerText
    const polylines = document.querySelectorAll('svg polyline').length
    const jump = !!document.querySelector('[aria-label="Szene springen"]')
    return { hasTitle: body.includes(expected.title), polylines, jump }
  }, { title: sc.title })
  const erpOk = sc.kind !== 'erp' || dom.polylines >= sc.expectedPolylines
  const ok = missing.length === 0 && dom.hasTitle && erpOk && dom.jump && cameraCheck.ok
  if (!ok) fails++
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${sc.id.padEnd(24)} config=${sc.configName.padEnd(24)} lit=${lit.length} missing=${missing.length ? missing.join(',') : '0'} title=${dom.hasTitle} polylines=${dom.polylines}/${sc.expectedPolylines} chrome=${dom.jump} camera=pos:${cameraCheck.positionDelta.toFixed(1)} target:${cameraCheck.targetDelta.toFixed(1)} fov:${cameraCheck.fovDelta.toFixed(1)} fit=${cameraCheck.fit}${cameraCheck.errors.length ? ` errors=${cameraCheck.errors.join('|')}` : ''}`,
  )
}

const configOnlyScene = SCENES.find((sc) => sc.kind === 'erp') ?? SCENES[0]
await page.goto(`${BASE}/?config=${configOnlyScene.configName}`, { waitUntil: 'networkidle' })
await waitBrain()
const configOnlyCamera = await waitCameraMatchesConfig(configOnlyScene)
const configOnlyVisible = await visibleNamedMeshCount()
const configOnlyDom = await page.evaluate((expected) => ({
  title: document.body.innerText.includes(expected.title),
  jump: !!document.querySelector('[aria-label="Szene springen"]'),
  url: window.location.search,
}), { title: configOnlyScene.title })
const configOnlyOk =
  configOnlyDom.title &&
  configOnlyDom.jump &&
  configOnlyDom.url.includes(`config=${configOnlyScene.configName}`) &&
  configOnlyVisible === visibleById[configOnlyScene.id] &&
  configOnlyCamera.ok
if (!configOnlyOk) fails++
console.log(
  `${configOnlyOk ? 'PASS' : 'FAIL'} config-only-link       config=${configOnlyScene.configName} title=${configOnlyDom.title} chrome=${configOnlyDom.jump} visible=${configOnlyVisible}/${visibleById[configOnlyScene.id]} camera=pos:${configOnlyCamera.positionDelta.toFixed(1)} target:${configOnlyCamera.targetDelta.toFixed(1)} fov:${configOnlyCamera.fovDelta.toFixed(1)} url=${configOnlyDom.url}${configOnlyCamera.errors.length ? ` errors=${configOnlyCamera.errors.join('|')}` : ''}`,
)

const stepLinkScene = configOnlyScene
await page.goto(`${BASE}/?scene=${stepLinkScene.id}&step=2`, { waitUntil: 'networkidle' })
await waitBrain()
await page.waitForTimeout(700)
const stepLinkDom = await page.evaluate((expected) => ({
  title: document.body.innerText.includes(expected.title),
  jump: !!document.querySelector('[aria-label="Szene springen"]'),
  url: window.location.search,
}), { title: stepLinkScene.title })
const stepLinkOk =
  stepLinkDom.title &&
  stepLinkDom.jump &&
  stepLinkDom.url.includes(`config=${stepLinkScene.configName}`) &&
  stepLinkDom.url.includes(`scene=${stepLinkScene.id}`) &&
  stepLinkDom.url.includes('step=2')
if (!stepLinkOk) fails++
console.log(
  `${stepLinkOk ? 'PASS' : 'FAIL'} scene-step-link        scene=${stepLinkScene.id} title=${stepLinkDom.title} chrome=${stepLinkDom.jump} url=${stepLinkDom.url}`,
)

const beforeConfigNavCam = await camPos()
const configOnlyIndex = SCENES.findIndex((sc) => sc.configName === configOnlyScene.configName)
const nextConfigScene = SCENES[Math.min(configOnlyIndex + 1, SCENES.length - 1)]
await page.keyboard.press('ArrowRight')
const afterConfigNavCamera = await waitCameraMatchesConfig(nextConfigScene)
const afterConfigNav = await page.evaluate((expected) => ({
  title: document.body.innerText.includes(expected.title),
  url: window.location.search,
}), { title: nextConfigScene.title })
const afterConfigNavCam = await camPos()
const configNavMove = dist(beforeConfigNavCam, afterConfigNavCam)
const configNavOk =
  afterConfigNav.title &&
  afterConfigNav.url.includes(`config=${nextConfigScene.configName}`) &&
  configNavMove > 5 &&
  afterConfigNavCamera.ok
if (!configNavOk) fails++
console.log(
  `${configNavOk ? 'PASS' : 'FAIL'} config-only-nav        next=${nextConfigScene.configName} title=${afterConfigNav.title} url=${afterConfigNav.url} cameraMove=${configNavMove.toFixed(1)} camera=pos:${afterConfigNavCamera.positionDelta.toFixed(1)} target:${afterConfigNavCamera.targetDelta.toFixed(1)} fov:${afterConfigNavCamera.fovDelta.toFixed(1)}${afterConfigNavCamera.errors.length ? ` errors=${afterConfigNavCamera.errors.join('|')}` : ''}`,
)

const mismatchConfig = SCENES[0]
const mismatchScene = SCENES.find((sc) => sc.id !== mismatchConfig.id)
if (!mismatchScene) throw new Error('smoke-scenes: config/scene-Mismatch braucht mindestens zwei Szenen')
pageErrors.length = 0
await page.goto(`${BASE}/?config=${mismatchConfig.configName}&scene=${mismatchScene.id}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const mismatchOk = pageErrors.some((message) =>
  message.includes(`URL-Config "${mismatchConfig.configName}"`) &&
  message.includes(`URL-Scene "${mismatchScene.id}" passt nicht`)
)
if (!mismatchOk) fails++
console.log(
  `${mismatchOk ? 'PASS' : 'FAIL'} config-scene-mismatch config=${mismatchConfig.configName} scene=${mismatchScene.id} failLoud=${mismatchOk}`,
)

// Deep-Link C bereits oben getestet. Jetzt Explorer-Modus: KEIN Presenter-Chrome, Viewer da.
await page.goto(`${BASE}/?mode=explore`, { waitUntil: 'networkidle' })
await waitBrain()
const explore = await page.evaluate(() => ({
  jump: !!document.querySelector('[aria-label="Szene springen"]'),
  header: document.body.innerText.includes('Struktur anklicken'),
}))
const exploreOk = !explore.jump && explore.header
if (!exploreOk) fails++
console.log(`${exploreOk ? 'PASS' : 'FAIL'} explore-mode            chrome=${explore.jump} (erwartet false) header=${explore.header}`)

// B2: Kamera framt unterschiedlich je Shot/Region. p3b (lateral-left, parietal) vs
// p3a (medial-midline, cingulum) muessen deutlich verschiedene Kamera-Positionen ergeben.
const camMove = dist(camById['p3b-engagement'], camById['p3a-konfliktmonitoring'])
const camOk = !!camById['p3a-konfliktmonitoring'] && camMove > 5
if (!camOk) fails++
console.log(`${camOk ? 'PASS' : 'FAIL'} camera-framing         |p3b-p3a|=${camMove.toFixed(1)} (erwartet >5)`)

await browser.close()
console.log(fails === 0 ? '\nALLE SMOKES GRÜN' : `\n${fails} SMOKE-FAILURES`)
process.exit(fails === 0 ? 0 : 1)
