import { expect, test, type Page, type TestInfo } from '@playwright/test'

interface ThreeLikeRoot {
  parent?: ThreeLikeRoot | null
  traverse: (cb: (obj: any) => void) => void
}

async function expectBrainCanvas(page: Page) {
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 60_000 })
  await expect.poll(async () => {
    const box = await canvas.boundingBox()
    return Math.min(box?.width ?? 0, box?.height ?? 0)
  }, { timeout: 60_000 }).toBeGreaterThan(100)
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: true })
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

test('Vortragspfad rendert im Beamer-Viewport mit ERP-Overlay', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/?config=p3a-konfliktmonitoring')

  await expect(page.getByRole('heading', { name: 'P3a — Konfliktmonitoring (No-go)' })).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('svg polyline')).toHaveCount(2)
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'beamer-p3a')
})

test('Explorer rendert im Tablet-Viewport mit Strukturbaum und Canvas', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/?mode=explore')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Strukturbaum').first()).toBeVisible()
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'tablet-explorer')
})

test('Färbungs-Legende lässt sich minimieren, ausblenden und wieder anzeigen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1180, height: 900 })
  await page.goto('/?mode=explore')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await page.locator('.ed-foot').getByRole('button', { name: /Färbung/ }).click()
  await page.getByRole('button', { name: 'Lateralität' }).click()
  const openColorDetails = page.getByLabel('Färbungsdetails öffnen')
  if (await openColorDetails.isVisible()) {
    await openColorDetails.click()
  }

  await expect(page.getByText('Lateralität').first()).toBeVisible()
  await expect(page.getByText('sinistral')).toBeVisible()

  await page.getByRole('button', { name: 'Legende minimieren' }).click()
  await expect(page.getByText('Lateralität').first()).toBeVisible()
  await expect(page.getByText('sinistral')).toBeHidden()

  await page.getByLabel('Färbungsdetails öffnen').click()
  await expect(page.getByText('sinistral')).toBeVisible()

  await page.getByRole('button', { name: 'Legende verbergen' }).click()
  await expect(page.getByText('sinistral')).toBeHidden()
  await expect(page.getByLabel('Färbungsdetails öffnen')).toBeVisible()

  await page.getByLabel('Färbungsdetails öffnen').click()
  await expect(page.getByText('sinistral')).toBeVisible()

  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'color-legend-minimize-hide')
})

test('Atlas-Carve erzeugt im Cut-Modus sichtbare Cap-Flächen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?mode=explore')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('group', { name: 'Carve-Atlas-Overlay' }).getByRole('button', { name: 'Julich' }).click()
  await page.getByRole('button', { name: /Schnitte/ }).click()
  await page.getByLabel('Schnitte: Aus').getByRole('button', { name: 'Sagittal' }).click()

  await page.waitForFunction(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    if (!root) return false
    while (root.parent) root = root.parent
    let clippedAtlas = false
    let visibleCaps = 0
    const atlasCapColors = new Set<string>()
    const atlasCapPlaneColors = new Set<string>()
    root.traverse((obj: any) => {
      if (!obj?.isMesh || !obj.visible) return
      if (obj.userData?.atlasSurface && obj.material?.clippingPlanes?.length > 0) clippedAtlas = true
      if (obj.userData?.cutCapHelper) visibleCaps += 1
      if (obj.userData?.atlasCapSource && obj.material?.clippingPlanes?.length > 0 && obj.material?.color) {
        atlasCapColors.add(obj.material.color.getHexString())
      }
      if (obj.userData?.cutCapHelper && obj.userData?.atlasCapSource && obj.material?.color) {
        atlasCapPlaneColors.add(obj.material.color.getHexString())
      }
    })
    return clippedAtlas && visibleCaps > 0 && atlasCapColors.size > 1 && atlasCapPlaneColors.size > 1
  }, { timeout: 60_000 })

  const counts = await page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    let clippedAtlas = 0
    let visibleCaps = 0
    let atlasCapSources = 0
    const atlasCapColors = new Set<string>()
    const atlasCapPlaneColors = new Set<string>()
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !obj.visible) return
      if (obj.userData?.atlasSurface && obj.material?.clippingPlanes?.length > 0) clippedAtlas += 1
      if (obj.userData?.cutCapHelper) visibleCaps += 1
      if (obj.userData?.atlasCapSource && obj.material?.clippingPlanes?.length > 0 && obj.material?.color) {
        atlasCapSources += 1
        atlasCapColors.add(obj.material.color.getHexString())
      }
      if (obj.userData?.cutCapHelper && obj.userData?.atlasCapSource && obj.material?.color) {
        atlasCapPlaneColors.add(obj.material.color.getHexString())
      }
    })
    return {
      clippedAtlas,
      visibleCaps,
      atlasCapSources,
      atlasCapColors: atlasCapColors.size,
      atlasCapPlaneColors: atlasCapPlaneColors.size,
    }
  })
  expect(counts.clippedAtlas).toBeGreaterThan(0)
  expect(counts.visibleCaps).toBeGreaterThan(0)
  expect(counts.atlasCapSources).toBeGreaterThan(1)
  expect(counts.atlasCapColors).toBeGreaterThan(1)
  expect(counts.atlasCapPlaneColors).toBeGreaterThan(1)
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'atlas-carve-cut-caps')
})

test('Config-Atlas-Carve respektiert Area-Scopes mit LUT-Alpha und Cap-Proxies', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?mode=explore&config=broca-areal&off=julich%3Aarea-44%3Al')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  const handle = await page.waitForFunction(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    if (!root) return null
    while (root.parent) root = root.parent
    const capNames: string[] = []
    let surface: {
      enabledAreaIds: string[]
      disabledAreaIds: string[]
      enabledSlugs: string[]
      disabledSlugs: string[]
      colorItemSize: number | null
      materialTransparent: boolean
      materialDepthWrite: boolean
    } | null = null
    root.traverse((obj: any) => {
      if (!obj?.isMesh || !obj.visible) return
      if (obj.userData?.atlasCapSource) capNames.push(obj.name)
      if (obj.userData?.atlasSurface && obj.userData?.atlasScopeFiltered) {
        const color = obj.geometry?.getAttribute?.('color')
        surface = {
          enabledAreaIds: obj.userData.atlasEnabledAreaIds ?? [],
          disabledAreaIds: obj.userData.atlasDisabledAreaIds ?? [],
          enabledSlugs: obj.userData.atlasEnabledSlugs ?? [],
          disabledSlugs: obj.userData.atlasDisabledSlugs ?? [],
          colorItemSize: color?.itemSize ?? null,
          materialTransparent: obj.material?.transparent === true,
          materialDepthWrite: obj.material?.depthWrite === true,
        }
      }
    })
    if (!surface || capNames.length === 0) return null
    return { surface, capNames }
  }, { timeout: 60_000 })

  const state = await handle.jsonValue()
  expect(state.surface.enabledAreaIds).toContain('julich:area-45:l')
  expect(state.surface.disabledAreaIds).toContain('julich:area-44:l')
  expect(state.surface.enabledSlugs).toContain('julich3-area-45-ifg-l')
  expect(state.surface.disabledSlugs).toContain('julich3-area-44-ifg-l')
  expect(state.surface.colorItemSize).toBe(4)
  expect(state.surface.materialTransparent).toBe(true)
  expect(state.surface.materialDepthWrite).toBe(false)
  expect(state.capNames).toContain('julich3-area-45-ifg-l')
  expect(state.capNames).not.toContain('julich3-area-44-ifg-l')

  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'atlas-carve-area-scope-alpha')
})

test('Figur-Färbung räumt aktive Atlas-Carves aus dem Viewer-State', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?mode=explore')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('group', { name: 'Carve-Atlas-Overlay' }).getByRole('button', { name: 'DKT' }).click()

  await page.waitForFunction(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    if (!root) return false
    while (root.parent) root = root.parent
    let atlasSurfaceMeshes = 0
    root.traverse((obj: any) => {
      if (obj?.isMesh && obj.visible && obj.userData?.atlasSurface) atlasSurfaceMeshes += 1
    })
    return atlasSurfaceMeshes > 0
  }, { timeout: 60_000 })

  await page.locator('.ed-foot').getByRole('button', { name: /Färbung/ }).click()
  await page.getByRole('button', { name: 'Basalganglienschleifen (Abb. 11-04)' }).click()
  await expect(page.getByRole('button', { name: /Basalganglienschleifen/ })).toBeVisible()

  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    let atlasSurfaceMeshes = 0
    let atlasCapSources = 0
    const legacyPresetMeshes: string[] = []
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !obj.visible) return
      if (obj.userData?.atlasSurface) atlasSurfaceMeshes += 1
      if (obj.userData?.atlasCapSource) atlasCapSources += 1
      const color = obj.material?.color?.getHexString?.()
      if (/^(left|right)-julich-/.test(obj.name) && ['4c85bd', 'bd854c', '4cbd85'].includes(color)) {
        legacyPresetMeshes.push(obj.name)
      }
    })
    return { atlasSurfaceMeshes, atlasCapSources, legacyPresetMeshes: legacyPresetMeshes.sort() }
  }), { timeout: 30_000 }).toEqual({ atlasSurfaceMeshes: 0, atlasCapSources: 0, legacyPresetMeshes: [] })

  await page.getByRole('button', { name: /Basalganglienschleifen/ }).click()
  await expect(page.locator('.ed-foot').getByText('Nur relevante Regionen')).toBeVisible()
  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    const out: Record<string, { visible: boolean; color: string | null }> = {}
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !['left-inferior-frontal-gyrus', 'left-caudate-nucleus'].includes(obj.name)) return
      out[obj.name] = {
        visible: obj.visible === true,
        color: obj.material?.color?.getHexString?.() ?? null,
      }
    })
    const uncolored = out['left-inferior-frontal-gyrus']
    const colored = out['left-caudate-nucleus']
    return {
      uncoloredHidden: uncolored?.visible === false,
      coloredSubcortexVisible: Boolean(colored?.visible && colored.color === '4c85bd'),
    }
  }), { timeout: 30_000 }).toEqual({
    uncoloredHidden: true,
    coloredSubcortexVisible: true,
  })

  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'figure-color-clears-atlas-carve')
})

test('Phineas-Modus rendert im Phone-Viewport mit Asset-Hinweis', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=phineas')

  await expect(page.getByText('Phineas Gage (1848)')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Standalone-Gage-GLBs aus \/assets\/phineas/)).toBeVisible()
  await page.getByRole('button', { name: '⟲ Anfang' }).click()
  await expect.poll(async () => page.evaluate(() => {
    const snapshot = (window as any).__phineasGageAssets
    if (!snapshot) return null
    return {
      showSkull: snapshot.showSkull,
      rodVisible: snapshot.rodVisible,
      skullBaseVisible: snapshot.layers.skullBase.visible,
      skullBasePickable: snapshot.layers.skullBase.pickableMeshCount > 0,
      skullBaseTargets: snapshot.layers.skullBase.targetInstanceIds,
      skullCalvariaVisible: snapshot.layers.skullCalvaria.visible,
      skullCalvariaPickable: snapshot.layers.skullCalvaria.pickableMeshCount > 0,
      skullCalvariaTargets: snapshot.layers.skullCalvaria.targetInstanceIds,
      ironRodVisible: snapshot.layers.ironRod.visible,
      ironRodPickable: snapshot.layers.ironRod.pickableMeshCount > 0,
      ironRodTargets: snapshot.layers.ironRod.targetInstanceIds,
    }
  }), { timeout: 60_000 }).toEqual({
    showSkull: true,
    rodVisible: false,
    skullBaseVisible: true,
    skullBasePickable: true,
    skullBaseTargets: ['phineas-gage-skull-base-01'],
    skullCalvariaVisible: true,
    skullCalvariaPickable: true,
    skullCalvariaTargets: ['phineas-gage-skull-calvaria-01'],
    ironRodVisible: false,
    ironRodPickable: false,
    ironRodTargets: ['phineas-gage-iron-rod-01'],
  })

  await page.getByRole('button', { name: '▶', exact: true }).click()
  await expect.poll(async () => page.evaluate(() => {
    const snapshot = (window as any).__phineasGageAssets
    if (!snapshot) return null
    return {
      showSkull: snapshot.showSkull,
      rodVisible: snapshot.rodVisible,
      skullBaseVisible: snapshot.layers.skullBase.visible,
      skullCalvariaVisible: snapshot.layers.skullCalvaria.visible,
      ironRodVisible: snapshot.layers.ironRod.visible,
      ironRodPickable: snapshot.layers.ironRod.pickableMeshCount > 0,
      ironRodTargets: snapshot.layers.ironRod.targetInstanceIds,
    }
  }), { timeout: 60_000 }).toEqual({
    showSkull: true,
    rodVisible: true,
    skullBaseVisible: true,
    skullCalvariaVisible: true,
    ironRodVisible: true,
    ironRodPickable: true,
    ironRodTargets: ['phineas-gage-iron-rod-01'],
  })
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'phone-phineas')
})
