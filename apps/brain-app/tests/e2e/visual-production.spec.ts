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
  }).toBeGreaterThan(100)
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

test('Phineas-Modus rendert im Phone-Viewport mit Asset-Hinweis', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=phineas')

  await expect(page.getByText('Phineas Gage (1848)')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/kein montiertes Original-Gage-CT\/GLB/)).toBeVisible()
  await expect(page.getByText(/Standalone unter \/assets\/phineas/)).toBeVisible()
  await expectBrainCanvas(page)
  await attachScreenshot(page, testInfo, 'phone-phineas')
})
