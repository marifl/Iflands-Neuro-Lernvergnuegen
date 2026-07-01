import { launchSmokeBrowser } from './smokeBrowser.mjs'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const ASSETS = {
  skullBase: '/assets/phineas/phineas-gage-skull-base.glb',
  skullCalvaria: '/assets/phineas/phineas-gage-skull-calvaria.glb',
  ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
}

const TARGETS = {
  skullBase: 'phineas-gage-skull-base-01',
  skullCalvaria: 'phineas-gage-skull-calvaria-01',
  ironRod: 'phineas-gage-iron-rod-01',
}

const SKULL_TRANSFORM = {
  position: [-6.1052611157404755, 22.986347198486328, 16.031952894185046],
  rotation: [0, Math.PI, 0],
  scale: [1.100639643699513, 1, 1.1039332125696444],
}

const CASES = [
  {
    id: 'desktop-phineas-gage-assets',
    path: '/?mode=phineas',
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
  },
  {
    id: 'phone-portrait-phineas-gage-assets',
    path: '/?mode=phineas',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
]

const browser = await launchSmokeBrowser()
let failures = 0

function pushClose(errors, label, actual, expected, tolerance = 0.75) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
    errors.push(`${label}=${actual} expected=${expected}`)
  }
}

function pushVecClose(errors, label, actual, expected, tolerance = 0.75) {
  if (!Array.isArray(actual) || actual.length !== 3) {
    errors.push(`${label}=fehlt`)
    return
  }
  for (let index = 0; index < 3; index += 1) {
    pushClose(errors, `${label}[${index}]`, actual[index], expected[index], tolerance)
  }
}

function pushLayerErrors(errors, layerId, layer, expected) {
  if (!layer) {
    errors.push(`${layerId}=fehlt`)
    return
  }
  if (layer.asset !== expected.asset) errors.push(`${layerId}.asset=${layer.asset}`)
  if (layer.meshCount < 1) errors.push(`${layerId}.meshCount=${layer.meshCount}`)
  if (!layer.targetInstanceIds?.includes(expected.target)) {
    errors.push(`${layerId}.target=${layer.targetInstanceIds?.join(',') ?? 'n/a'}`)
  }
  if (expected.transform) {
    pushVecClose(errors, `${layerId}.transform.position`, layer.transform?.position, expected.transform.position, 0.001)
    pushVecClose(errors, `${layerId}.transform.rotation`, layer.transform?.rotation, expected.transform.rotation, 0.001)
    pushVecClose(errors, `${layerId}.transform.scale`, layer.transform?.scale, expected.transform.scale, 0.001)
  }
  if (expected.bounds) {
    pushVecClose(errors, `${layerId}.bounds.center`, layer.bounds?.center, expected.bounds.center, 0.75)
    pushVecClose(errors, `${layerId}.bounds.size`, layer.bounds?.size, expected.bounds.size, 0.75)
  }
  if (expected.visible) {
    if (!layer.visible) errors.push(`${layerId}.visible=false`)
    if (layer.visibleMeshCount < 1) errors.push(`${layerId}.visibleMeshCount=${layer.visibleMeshCount}`)
    if (layer.pickableMeshCount < 1) errors.push(`${layerId}.pickableMeshCount=${layer.pickableMeshCount}`)
  } else {
    if (layer.visible) errors.push(`${layerId}.visible=true`)
    if (layer.visibleMeshCount > 0) errors.push(`${layerId}.visibleMeshCount=${layer.visibleMeshCount}`)
  }
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__phineasGageAssets)
}

async function waitForSnapshot(page) {
  await page.waitForFunction(() => {
    const snapshot = window.__phineasGageAssets
    return Boolean(
      snapshot &&
      snapshot.groupName === 'phineas-gage-assets' &&
      snapshot.layers?.skullBase?.meshCount >= 1 &&
      snapshot.layers?.skullCalvaria?.meshCount >= 1 &&
      snapshot.layers?.ironRod?.meshCount >= 1,
    )
  }, { timeout: 60000 })
}

async function validateStepOne(page, errors) {
  await waitForSnapshot(page)
  await page.waitForFunction(() => {
    const snapshot = window.__phineasGageAssets
    return Boolean(
      snapshot &&
      snapshot.showSkull === true &&
      snapshot.rodVisible === false &&
      snapshot.layers?.skullBase?.visible === true &&
      snapshot.layers?.skullCalvaria?.visible === true,
    )
  }, { timeout: 15000 })
  await page.getByText(/Standalone-Gage-GLBs aus \/assets\/phineas/).waitFor({ timeout: 10000 })
  await page.getByText(/generierte Eisenstangen-GLB statt eines gekürzten Zylinder-Markers/).waitFor({
    timeout: 10000,
  })

  const snapshot = await readSnapshot(page)
  if (snapshot.groupName !== 'phineas-gage-assets') errors.push(`groupName=${snapshot.groupName}`)
  if (snapshot.showSkull !== true) errors.push(`step1.showSkull=${snapshot.showSkull}`)
  if (snapshot.rodVisible !== false) errors.push(`step1.rodVisible=${snapshot.rodVisible}`)

  pushLayerErrors(errors, 'step1.skullBase', snapshot.layers.skullBase, {
    asset: ASSETS.skullBase,
    target: TARGETS.skullBase,
    transform: SKULL_TRANSFORM,
    visible: true,
  })
  pushLayerErrors(errors, 'step1.skullCalvaria', snapshot.layers.skullCalvaria, {
    asset: ASSETS.skullCalvaria,
    target: TARGETS.skullCalvaria,
    transform: SKULL_TRANSFORM,
    visible: true,
  })
  pushLayerErrors(errors, 'step1.ironRod', snapshot.layers.ironRod, {
    asset: ASSETS.ironRod,
    target: TARGETS.ironRod,
    visible: false,
  })
  return snapshot
}

async function validateStepTwo(page, errors) {
  await page.getByRole('button', { name: '❚❚ Pause' }).click()
  await page.locator('button.ed-btn').filter({ hasText: /^▶$/ }).click()
  await page.waitForFunction(() => {
    const snapshot = window.__phineasGageAssets
    return Boolean(
      snapshot &&
      snapshot.rodVisible === true &&
      snapshot.layers?.skullBase?.visible === true &&
      snapshot.layers?.skullCalvaria?.visible === true &&
      snapshot.layers?.ironRod?.visible === true,
    )
  }, { timeout: 15000 })

  const snapshot = await readSnapshot(page)
  if (snapshot.showSkull !== true) errors.push(`step2.showSkull=${snapshot.showSkull}`)
  if (snapshot.rodVisible !== true) errors.push(`step2.rodVisible=${snapshot.rodVisible}`)

  pushLayerErrors(errors, 'step2.skullBase', snapshot.layers.skullBase, {
    asset: ASSETS.skullBase,
    target: TARGETS.skullBase,
    transform: SKULL_TRANSFORM,
    visible: true,
  })
  pushLayerErrors(errors, 'step2.skullCalvaria', snapshot.layers.skullCalvaria, {
    asset: ASSETS.skullCalvaria,
    target: TARGETS.skullCalvaria,
    transform: SKULL_TRANSFORM,
    visible: true,
  })
  pushLayerErrors(errors, 'step2.ironRod', snapshot.layers.ironRod, {
    asset: ASSETS.ironRod,
    target: TARGETS.ironRod,
    visible: true,
  })
  return snapshot
}

for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    hasTouch: testCase.hasTouch,
    isMobile: testCase.hasTouch,
  })
  const page = await context.newPage()
  const errors = []

  try {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await page.waitForSelector('canvas', { timeout: 60000 })

    const stepOne = await validateStepOne(page, errors)
    const stepTwo = await validateStepTwo(page, errors)
    const overflowX = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )
    if (overflowX > 1) errors.push(`overflowX=${overflowX}`)

    console.log(
      `${errors.length ? 'FAIL' : 'PASS'} ${testCase.id} ` +
      `step1=base:${stepOne.layers.skullBase.visibleMeshCount}/${stepOne.layers.skullBase.meshCount},` +
      `calvaria:${stepOne.layers.skullCalvaria.visibleMeshCount}/${stepOne.layers.skullCalvaria.meshCount},` +
      `rod:${stepOne.layers.ironRod.visibleMeshCount}/${stepOne.layers.ironRod.meshCount} ` +
      `step2=base:${stepTwo.layers.skullBase.visibleMeshCount}/${stepTwo.layers.skullBase.meshCount},` +
      `calvaria:${stepTwo.layers.skullCalvaria.visibleMeshCount}/${stepTwo.layers.skullCalvaria.meshCount},` +
      `rod:${stepTwo.layers.ironRod.visibleMeshCount}/${stepTwo.layers.ironRod.meshCount}` +
      `${errors.length ? ` | ${errors.join(' | ')}` : ''}`,
    )
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    console.log(`FAIL ${testCase.id} ${errors.join(' | ')}`)
  } finally {
    if (errors.length) failures += 1
    await context.close()
  }
}

await browser.close()
if (failures) process.exit(1)
