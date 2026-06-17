import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const ASSETS = {
  skull: '/assets/phineas/phineas-gage-skull-lod.glb',
  calvariumCut: '/assets/phineas/phineas-gage-skull-calvarium-cut-lod.glb',
  ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
}

const TARGETS = {
  skull: 'phineas-gage-skull-01',
  calvariumCut: 'phineas-gage-calvarium-cut-01',
  ironRod: 'phineas-gage-iron-rod-01',
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

const browser = await chromium.launch()
let failures = 0

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
      snapshot.layers?.skull?.meshCount >= 1 &&
      snapshot.layers?.calvariumCut?.meshCount >= 1 &&
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
      snapshot.layers?.skull?.visible === true,
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

  pushLayerErrors(errors, 'step1.skull', snapshot.layers.skull, {
    asset: ASSETS.skull,
    target: TARGETS.skull,
    visible: true,
  })
  pushLayerErrors(errors, 'step1.calvariumCut', snapshot.layers.calvariumCut, {
    asset: ASSETS.calvariumCut,
    target: TARGETS.calvariumCut,
    visible: false,
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
      snapshot.layers?.calvariumCut?.visible === true &&
      snapshot.layers?.ironRod?.visible === true,
    )
  }, { timeout: 15000 })

  const snapshot = await readSnapshot(page)
  if (snapshot.showSkull !== true) errors.push(`step2.showSkull=${snapshot.showSkull}`)
  if (snapshot.rodVisible !== true) errors.push(`step2.rodVisible=${snapshot.rodVisible}`)

  pushLayerErrors(errors, 'step2.skull', snapshot.layers.skull, {
    asset: ASSETS.skull,
    target: TARGETS.skull,
    visible: false,
  })
  pushLayerErrors(errors, 'step2.calvariumCut', snapshot.layers.calvariumCut, {
    asset: ASSETS.calvariumCut,
    target: TARGETS.calvariumCut,
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
      `step1=skull:${stepOne.layers.skull.visibleMeshCount}/${stepOne.layers.skull.meshCount},` +
      `rod:${stepOne.layers.ironRod.visibleMeshCount}/${stepOne.layers.ironRod.meshCount} ` +
      `step2=calvarium:${stepTwo.layers.calvariumCut.visibleMeshCount}/${stepTwo.layers.calvariumCut.meshCount},` +
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
