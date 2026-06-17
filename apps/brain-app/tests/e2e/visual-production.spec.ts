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

async function setRangeValue(page: Page, label: string, value: number) {
  await page.getByLabel(label).evaluate((node, nextValue) => {
    const input = node as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, String(nextValue))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
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
  await page.getByRole('button', { name: /Farbe/ }).click()
  await page.getByRole('button', { name: 'Lateralität' }).click()

  await expect(page.getByText('Lateralität').first()).toBeVisible()
  await expect(page.getByText('sinistral')).toBeVisible()

  await page.getByRole('button', { name: 'Legende minimieren' }).click()
  await expect(page.getByText('Lateralität').first()).toBeVisible()
  await expect(page.getByText('sinistral')).toBeHidden()

  await page.getByRole('button', { name: 'Legende erweitern' }).click()
  await expect(page.getByText('sinistral')).toBeVisible()

  await page.getByRole('button', { name: 'Legende verbergen' }).click()
  await expect(page.getByText('sinistral')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Legende anzeigen' })).toBeVisible()

  await page.getByRole('button', { name: 'Legende anzeigen' }).click()
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
  await page.getByRole('button', { name: 'Sagittal' }).click()

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
  await page.goto('/?sequence=presentation.kapitel11-vorlesung&config=broca-areal&scene=broca-areal&step=0&off=julich%3Aarea-44%3Al')

  await expect(page.getByRole('heading', { name: /Broca-Areal/ })).toBeVisible({ timeout: 60_000 })
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

  await page.getByRole('button', { name: /Farbe/ }).click()
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
  await setRangeValue(page, 'Relevante Areale fokussieren', 1)
  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    const out: Record<string, { visible: boolean; opacity: number; transparent: boolean; color: string | null }> = {}
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !['left-inferior-frontal-gyrus', 'left-caudate-nucleus'].includes(obj.name)) return
      out[obj.name] = {
        visible: obj.visible === true,
        opacity: Number(obj.material?.opacity ?? 1),
        transparent: obj.material?.transparent === true,
        color: obj.material?.color?.getHexString?.() ?? null,
      }
    })
    const uncolored = out['left-inferior-frontal-gyrus']
    const colored = out['left-caudate-nucleus']
    return {
      uncoloredDimmed: Boolean(uncolored?.visible && uncolored.transparent && uncolored.opacity < 0.5),
      coloredSubcortexVisible: Boolean(colored?.visible && !colored.transparent && colored.color === '4c85bd'),
    }
  }), { timeout: 30_000 }).toEqual({
    uncoloredDimmed: true,
    coloredSubcortexVisible: true,
  })

  await setRangeValue(page, 'Ungefärbte ausblenden', 1)
  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    const out: Record<string, boolean> = {}
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !['left-inferior-frontal-gyrus', 'left-caudate-nucleus'].includes(obj.name)) return
      out[obj.name] = obj.visible === true
    })
    return out
  }), { timeout: 30_000 }).toEqual({
    'left-inferior-frontal-gyrus': false,
    'left-caudate-nucleus': true,
  })

  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'figure-color-clears-atlas-carve')
})

test('Phineas-Modus rendert im Phone-Viewport mit Asset-Hinweis', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=phineas')

  await expect(page.getByText('Phineas Gage (1848)')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Standalone-Gage-GLBs aus \/assets\/phineas/)).toBeVisible()
  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    const visible: Record<string, { visible: boolean; targetKind: string | null; collectionId: string | null; pickable: boolean }> = {
      'phineas-gage-skull': { visible: false, targetKind: null, collectionId: null, pickable: false },
      'phineas-gage-skull-calvarium-cut': { visible: false, targetKind: null, collectionId: null, pickable: false },
      'phineas-gage-iron-rod': { visible: false, targetKind: null, collectionId: null, pickable: false },
    }
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !(obj.name in visible)) return
      visible[obj.name] = {
        visible: obj.visible === true,
        targetKind: obj.userData?.sequenceTargetRef?.targetKind ?? null,
        collectionId: obj.userData?.sequenceTargetRef?.collectionId ?? null,
        pickable: obj.userData?.targetPickable === true,
      }
    })
    return visible
  }), { timeout: 60_000 }).toEqual({
    'phineas-gage-skull': { visible: true, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
    'phineas-gage-skull-calvarium-cut': { visible: false, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
    'phineas-gage-iron-rod': { visible: false, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
  })

  await page.getByRole('button', { name: '▶' }).click()
  await expect.poll(async () => page.evaluate(() => {
    let root = (window as unknown as { __THREE_SCENE__?: ThreeLikeRoot }).__THREE_SCENE__
    while (root?.parent) root = root.parent
    const visible: Record<string, { visible: boolean; targetKind: string | null; collectionId: string | null; pickable: boolean }> = {
      'phineas-gage-skull': { visible: false, targetKind: null, collectionId: null, pickable: false },
      'phineas-gage-skull-calvarium-cut': { visible: false, targetKind: null, collectionId: null, pickable: false },
      'phineas-gage-iron-rod': { visible: false, targetKind: null, collectionId: null, pickable: false },
    }
    root?.traverse((obj: any) => {
      if (!obj?.isMesh || !(obj.name in visible)) return
      visible[obj.name] = {
        visible: obj.visible === true,
        targetKind: obj.userData?.sequenceTargetRef?.targetKind ?? null,
        collectionId: obj.userData?.sequenceTargetRef?.collectionId ?? null,
        pickable: obj.userData?.targetPickable === true,
      }
    })
    return visible
  }), { timeout: 60_000 }).toEqual({
    'phineas-gage-skull': { visible: false, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
    'phineas-gage-skull-calvarium-cut': { visible: true, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
    'phineas-gage-iron-rod': { visible: true, targetKind: 'asset-part', collectionId: 'case-phineas-gage', pickable: true },
  })
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'phone-phineas')
})
