import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  ASSET_MANIFEST_SCHEMA_VERSION,
  type AssetManifestDocument,
} from '../../src/viewer/assetManifest'
import { createAuthoringSceneFromManifestSlot } from '../../src/viewer/authoringAssetLoader'

const eegAssetManifest: AssetManifestDocument = {
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  manifestId: 'browser-smoke-assets',
  assets: [
    {
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      slotId: 'eeg-device-model',
      label: 'EEG cap device',
      uri: '/assets/devices/eeg/eeg-cap-v1.glb',
      format: 'glb',
      optional: true,
      version: '1.0.0',
      source: {
        kind: 'curated',
        provenance: 'synthetic EEG cap fixture for browser smoke',
        license: 'internal-test-fixture',
        hash: `sha256:${'a'.repeat(64)}`,
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 1,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'asset-origin' },
        rootTransform: {
          position: [0, 1.2, 0],
          rotation: [0, 0.25, 0],
          scale: [0.8, 0.8, 0.8],
        },
      },
      materialPolicy: {
        materials: 'source-materials',
        transparency: 'alpha-blend',
        shareMaterials: true,
      },
      nodeNaming: {
        requireStableNodeNames: true,
        nodeNamePattern: '^[A-Za-z0-9_.:-]+$',
        partIdPattern: '^[a-z0-9][a-z0-9-]*$',
      },
      parts: [
        { partId: 'electrode-fz', label: 'Fz electrode', nodeName: 'EEG_Fz', pickable: true, role: 'selectable' },
      ],
    },
  ],
}

async function expectBrainCanvas(page: Page) {
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 60_000 })
  await expect.poll(async () => {
    const box = await canvas.boundingBox()
    return Math.min(box?.width ?? 0, box?.height ?? 0)
  }).toBeGreaterThan(100)
}

async function expectMeshVisibility(page: Page, expected: Record<string, boolean>) {
  await page.waitForFunction((visibility) => {
    let root = (window as unknown as { __THREE_SCENE__?: { parent?: unknown; traverse: (cb: (obj: any) => void) => void } }).__THREE_SCENE__
    if (!root) return false
    while ((root as any).parent) root = (root as any).parent
    const seen: Record<string, boolean> = {}
    root.traverse((obj: any) => {
      if (obj?.isMesh && obj.name in visibility) seen[obj.name] = obj.visible === true
    })
    return Object.entries(visibility).every(([name, visible]) => seen[name] === visible)
  }, expected, { timeout: 60_000 })
}

async function clickProjectedMesh(page: Page, meshName: string) {
  await page.waitForFunction((name) => {
    let root = (window as unknown as { __THREE_SCENE__?: { parent?: unknown; traverse: (cb: (obj: any) => void) => void } }).__THREE_SCENE__
    if (!root) return false
    while ((root as any).parent) root = (root as any).parent
    let found = false
    root.traverse((obj: any) => {
      if (obj?.isMesh && obj.name === name && obj.visible && obj.userData?.targetPickable === true) found = true
    })
    return found
  }, meshName, { timeout: 60_000 })

  const point = await page.evaluate((name) => {
    const canvas = document.querySelector('canvas')
    const THREE = (window as any).__THREE__
    const camera = (window as any).__THREE_CAMERA__
    let root = (window as any).__THREE_SCENE__
    if (!canvas || !THREE || !camera || !root) return null
    while (root.parent) root = root.parent
    let target: any = null
    root.traverse((obj: any) => {
      if (obj?.isMesh && obj.name === name) target = obj
    })
    if (!target) return null
    target.updateWorldMatrix(true, false)
    camera.updateMatrixWorld?.()
    const world = new THREE.Vector3()
    target.getWorldPosition(world)
    world.project(camera)
    const rect = canvas.getBoundingClientRect()
    return {
      x: rect.left + ((world.x + 1) / 2) * rect.width,
      y: rect.top + ((-world.y + 1) / 2) * rect.height,
    }
  }, meshName)
  expect(point).toBeTruthy()
  await page.mouse.click(point!.x, point!.y)
}

async function expectAuthoringInstancePosition(page: Page, instanceName: string, expected: [number, number, number]) {
  await page.waitForFunction(({ name, position }) => {
    let root = (window as any).__THREE_SCENE__
    if (!root) return false
    while (root.parent) root = root.parent
    let found: any = null
    root.traverse((obj: any) => {
      if (obj?.name === name) found = obj
    })
    if (!found) return false
    return (
      Math.abs(found.position.x - position[0]) < 0.001 &&
      Math.abs(found.position.y - position[1]) < 0.001 &&
      Math.abs(found.position.z - position[2]) < 0.001
    )
  }, { name: instanceName, position: expected }, { timeout: 60_000 })
}

test('Startscreen startet den Lernmodus', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Womit möchtest du starten?' })).toBeVisible()
  await page.getByRole('button', { name: /^Lernen/ }).click()

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Drei Basalganglien-Schleifen' })).toBeVisible()
  await expectBrainCanvas(page)
})

test('Szenen-Deep-Link lädt Lernszene und kanonisiert die URL', async ({ page }) => {
  await page.goto('/?scene=vcpt')

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Visueller Konzentrationsverlaufstest (VCPT)' })).toBeVisible()
  await expect(page).toHaveURL(/config=vcpt/)
  await expect(page).toHaveURL(/scene=vcpt/)
  await expect(page).toHaveURL(/step=0/)
  await expectBrainCanvas(page)
})

test('ungueltiger Step-Deep-Link wird auf den ersten Schritt normalisiert', async ({ page }) => {
  await page.goto('/?scene=vcpt&step=-1')

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Visueller Konzentrationsverlaufstest (VCPT)' })).toBeVisible()
  await expect(page).toHaveURL(/step=0/)
})

test('Config-Deep-Link rekonstruiert Figur- und Szenenzustand', async ({ page }) => {
  await page.goto('/?config=p3a-konfliktmonitoring')

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'P3a — Konfliktmonitoring (No-go)' })).toBeVisible()
  await expect(page).toHaveURL(/config=p3a-konfliktmonitoring/)
  await expect(page).toHaveURL(/scene=p3a-konfliktmonitoring/)
  await expect(page.locator('svg polyline')).toHaveCount(2)
  await expectBrainCanvas(page)
})

test('Presentation-Sequenz laedt Start, Weiter und direkten Step-Link', async ({ page }) => {
  await page.goto('/?sequence=presentation.kapitel11-vorlesung&config=basalganglienschleifen')

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Vortrag')).toBeVisible()
  await expect(page.getByText('Kapitel 11 — Vorlesung')).toBeVisible()
  await expect(page.getByLabel('Aktueller Vortragsschritt')).toHaveText('Folie 1 / 4 · Step 1')
  await expect(page.getByRole('heading', { name: 'Drei Basalganglien-Schleifen' })).toBeVisible()
  await expect(page).toHaveURL(/sequence=presentation\.kapitel11-vorlesung/)
  await expect(page).toHaveURL(/config=basalganglienschleifen/)
  await expect(page).toHaveURL(/scene=basalganglienschleifen/)

  await page.keyboard.press('ArrowRight')

  await expect(page.getByRole('heading', { name: 'Broca-Areal — Area 44/45 als VLPFC-Anker' })).toBeVisible()
  await expect(page.getByLabel('Aktueller Vortragsschritt')).toHaveText('Folie 2 / 4 · Step 1')
  await expect(page).toHaveURL(/sequence=presentation\.kapitel11-vorlesung/)
  await expect(page).toHaveURL(/config=broca-areal/)
  await expect(page).toHaveURL(/scene=broca-areal/)

  await page.goto('/?sequence=presentation.kapitel11-vorlesung&config=vcpt&scene=vcpt&step=0')

  await expect(page.getByRole('heading', { name: 'Visueller Konzentrationsverlaufstest (VCPT)' })).toBeVisible()
  await expect(page).toHaveURL(/sequence=presentation\.kapitel11-vorlesung/)
  await expect(page).toHaveURL(/config=vcpt/)
  await expect(page).toHaveURL(/scene=vcpt/)
  await expectBrainCanvas(page)
})

const AUTHORING_ROUNDTRIP_VIEWPORTS = [
  { name: 'Desktop', size: { width: 1440, height: 900 } },
  { name: 'Schmal', size: { width: 390, height: 844 } },
] as const

async function runAuthoringSnapshotRoundtrip(page: Page) {
  const loadedAuthoringScene = createAuthoringSceneFromManifestSlot(eegAssetManifest, 'vcpt-device-authoring', {
    collectionId: 'device-eeg-10-20',
    slotId: 'eeg-device-model',
    assetId: 'asset:eeg-cap-v1',
    optional: true,
    instanceId: 'eeg-cap-01',
  })
  if (loadedAuthoringScene.status !== 'loaded') throw new Error(loadedAuthoringScene.reason)
  const snapshot = {
    version: 1,
    state: {
      authoring: {
        schemaVersion: 1,
        registryContext: {
          collectionIds: ['device-eeg-10-20'],
          bonusContextIds: ['eeg-erp-vcpt'],
        },
        authoringScenes: [loadedAuthoringScene.scene],
        timelines: [
          {
            schemaVersion: 1,
            timelineId: 'vcpt-device-timeline',
            restore: { stepId: 'vcpt-device-step', keyframeId: 'fz-highlight' },
            steps: [
              {
                stepId: 'vcpt-device-step',
                order: 0,
                durationMs: 3000,
                keyframes: [{ keyframeId: 'fz-highlight', atMs: 0, channels: {} }],
              },
            ],
          },
        ],
        activeSceneId: 'vcpt-device-authoring',
        activeTargetRef: {
          targetKind: 'asset-part',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
          partId: 'electrode-fz',
        },
        activeTimeline: {
          timelineId: 'vcpt-device-timeline',
          stepId: 'vcpt-device-step',
          keyframeId: 'fz-highlight',
        },
      },
    },
  }
  await page.goto('/?mode=explore')
  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })

  await page.getByLabel('Unterrichts-Snapshot-Datei').setInputFiles({
    name: 'authoring-snapshot.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  })

  await page.getByRole('button', { name: /Datei/ }).click()
  const devicePartTarget = 'target:asset-part:device-eeg-10-20:eeg-cap-01:electrode-fz'
  await clickProjectedMesh(page, devicePartTarget)
  await expect(page.getByText('Fz electrode')).toBeVisible()
  await expect.poll(async () => page.evaluate(() => (window as any).__BRAIN_LAST_PICK_TARGET__)).toEqual({
    targetKind: 'asset-part',
    collectionId: 'device-eeg-10-20',
    instanceId: 'eeg-cap-01',
    partId: 'electrode-fz',
  })

  await page.getByRole('button', { name: /Werkzeug/ }).click()
  await page.getByRole('button', { name: 'Verschieben' }).click()
  await page.getByRole('button', { name: 'X +5' }).click()
  await expect.poll(async () => page.evaluate(() => (window as any).__BRAIN_LAST_AUTHORING_COMMAND__)).toMatchObject({
    kind: 'set-transform',
    targetRef: { targetKind: 'asset-instance', collectionId: 'device-eeg-10-20', instanceId: 'eeg-cap-01' },
    after: { position: [5, 1.2, 0] },
  })
  await expectAuthoringInstancePosition(page, 'authoring-instance:device-eeg-10-20:eeg-cap-01', [5, 1.2, 0])

  await page.getByRole('button', { name: /Datei/ }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportieren' }).click(),
  ])
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const exported = JSON.parse(await readFile(downloadPath!, 'utf8'))

  expect(exported.state.authoring.activeSceneId).toBe('vcpt-device-authoring')
  expect(exported.state.authoring.activeTargetRef).toEqual(snapshot.state.authoring.activeTargetRef)
  expect(exported.state.authoring.activeTimeline).toEqual(snapshot.state.authoring.activeTimeline)
  expect(exported.state.authoring.authoringScenes[0].assetInstances[0].transform).toEqual({
    position: [5, 1.2, 0],
    rotation: [0, 0.25, 0],
    scale: [0.8, 0.8, 0.8],
  })

  await page.goto('/?mode=explore')
  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await page.getByLabel('Unterrichts-Snapshot-Datei').setInputFiles({
    name: 'authoring-snapshot-exported.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  })
  await expectAuthoringInstancePosition(page, 'authoring-instance:device-eeg-10-20:eeg-cap-01', [5, 1.2, 0])
}

for (const viewport of AUTHORING_ROUNDTRIP_VIEWPORTS) {
  test(`Authoring-Snapshot roundtript Device-State ueber Import und Export (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport.size)
    await runAuthoringSnapshotRoundtrip(page)
  })
}

test('Preset-Deep-Links setzen unterschiedliche Default-Sichtbarkeit', async ({ page }) => {
  await page.goto('/?mode=explore&preset=kapitel11')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await expectMeshVisibility(page, { 'left-insula': false, 'right-insula': false })

  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await expectMeshVisibility(page, { 'left-insula': true, 'right-insula': true })
})

test('Strukturbaum-Mehrfachauswahl wirkt auf ein gemeinsames Selection-Set', async ({ page }) => {
  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await page.getByPlaceholder('Struktur suchen…').fill('Insel (ganz)')

  await page.getByRole('button', { name: /Insel \(ganz\) \(links\)/ }).click()
  await page.getByRole('button', { name: /Insel \(ganz\) \(rechts\)/ }).click({ modifiers: ['Shift'] })

  await expect(page.getByText('2 Ziele')).toBeVisible()
  await page.getByRole('button', { name: /Werkzeug/ }).click()
  await page.getByRole('button', { name: 'Auswahl ausblenden' }).click()
  await expectMeshVisibility(page, { 'left-insula': false, 'right-insula': false })
})

test('Mobile Explorer zeigt Auswahlaktionen direkt am Struktur-HUD', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await expect.poll(async () => {
    const box = await page.locator('.ed-foot').boundingBox()
    return Math.round(box?.height ?? 0)
  }).toBeLessThan(156)
  await expect.poll(async () => (
    page.locator('.app-shell').evaluate((element) => getComputedStyle(element).borderBottomLeftRadius)
  )).toBe('0px')
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).display)
  )).toBe('grid')
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).overflowX)
  )).toBe('visible')
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  )).toBe(4)
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => {
      const footer = element.getBoundingClientRect()
      const lastButton = element.querySelector('.col:last-child .flyout-trigger')?.getBoundingClientRect()
      return lastButton ? Math.round(footer.bottom - lastButton.bottom) : -1
    })
  )).toBeLessThanOrEqual(2)
  await expect.poll(async () => (
    page.locator('.ed-foot .flyout-icon').first().evaluate((element) => getComputedStyle(element).display)
  )).toBe('flex')
  await expect.poll(async () => (
    page.locator('.ed-foot .flyout-caret').first().evaluate((element) => getComputedStyle(element).display)
  )).toBe('none')
  const mobileDockLabels = await page.locator('.ed-foot > .col').evaluateAll((nodes) => (
    nodes.map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  ))
  expect(mobileDockLabels[0]).toContain('Modus')
  expect(mobileDockLabels[1]).toContain('Werkzeug')
  expect(mobileDockLabels[2]).toContain('Ansicht')
  await expect(page.getByRole('button', { name: /Werkzeug/ })).toBeVisible()
  await page.locator('.ed-foot').evaluate((element) => { element.scrollLeft = element.scrollWidth })
  await page.getByRole('button', { name: /Zustand/ }).click()
  const footerFlyout = page.locator('.ed-foot .ed-panel')
  await expect.poll(async () => (
    footerFlyout.boundingBox()
  )).toMatchObject({ x: expect.any(Number), width: expect.any(Number) })
  const flyoutBox = await footerFlyout.boundingBox()
  const viewport = page.viewportSize()
  expect(flyoutBox?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect((flyoutBox?.x ?? 0) + (flyoutBox?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Strukturbaum öffnen' }).click()

  const drawer = page.getByTestId('mobile-structure-drawer')
  await expect(drawer).toBeVisible()
  await expect.poll(async () => {
    const box = await drawer.boundingBox()
    return box?.height ?? 0
  }).toBeGreaterThan(500)

  const expandHit = drawer.locator('.structure-expand-hit').first()
  const labelHit = expandHit.locator('xpath=following-sibling::button[contains(@class, "structure-label-hit")]')
  await expect(expandHit).toBeVisible()
  await expect.poll(async () => {
    const box = await expandHit.boundingBox()
    return Math.min(box?.width ?? 0, box?.height ?? 0)
  }).toBeGreaterThanOrEqual(44)
  await expandHit.click()
  await expect(labelHit).toHaveAttribute('aria-pressed', 'false')

  await expect(labelHit).toBeVisible()
  await expect.poll(async () => {
    const box = await labelHit.boundingBox()
    return box?.height ?? 0
  }).toBeGreaterThanOrEqual(44)

  await page.getByPlaceholder('Struktur suchen…').fill('Insel (ganz)')
  await page.getByRole('button', { name: /Insel \(ganz\) \(links\)/ }).click()

  await expect(page.getByRole('button', { name: 'Ausblenden' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Isolieren' })).toBeVisible()
  await page.getByRole('button', { name: 'Ausblenden' }).click()
  await expectMeshVisibility(page, { 'left-insula': false })
})

test('Mobile Footer-Menue reagiert auf echte Touch-Taps', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('http://127.0.0.1:5174/?mode=explore&preset=explorer')

    await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
    await expectBrainCanvas(page)
    await expect.poll(async () => (
      page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).overflowX)
    )).toBe('visible')
    await page.getByRole('button', { name: /Werkzeug/ }).tap()
    await expect(page.getByRole('button', { name: 'Verschieben' })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('Mobile Lernbezug dupliziert die Struktur-Beschriftung nicht', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await page.getByRole('button', { name: 'Strukturbaum öffnen' }).click()
  await page.getByPlaceholder('Struktur suchen…').fill('Obere Stirnwindung rechts')
  await page.getByRole('button', { name: /Obere Stirnwindung \(rechts\)/ }).click()

  await expect(page.getByRole('dialog', { name: 'Lernbezug Obere Stirnwindung (rechts)' })).toBeVisible()
  await expect(page.getByText('Obere Stirnwindung (rechts)')).toHaveCount(1)
  await expect(page.getByText('DLPFC / SMA-Region (medial)')).toHaveCount(1)
  await expect(page.getByText('P3z - Inhibition')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Strukturbaum öffnen' })).toBeHidden()
})

test('Mobile Rahmen ist nur in installierter PWA unten gerundet', async ({ browser }) => {
  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const browserPage = await browserContext.newPage()
  try {
    await browserPage.goto('http://127.0.0.1:5174/?mode=explore&preset=explorer')
    await expect(browserPage.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
    await expect.poll(async () => (
      browserPage.locator('.app-shell').evaluate((element) => getComputedStyle(element).borderBottomLeftRadius)
    )).toBe('0px')
  } finally {
    await browserContext.close()
  }

  const standaloneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  await standaloneContext.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      if (query === '(display-mode: standalone)') {
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList
      }
      return originalMatchMedia(query)
    }
  })
  const standalonePage = await standaloneContext.newPage()
  try {
    await standalonePage.goto('http://127.0.0.1:5174/?mode=explore&preset=explorer')
    await expect(standalonePage.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
    await expect.poll(async () => (
      standalonePage.locator('.app-shell').evaluate((element) => getComputedStyle(element).borderBottomLeftRadius)
    )).toBe('28px')
    await expect.poll(async () => (
      standalonePage.locator('.app-shell').evaluate((element) => getComputedStyle(element).borderTopLeftRadius)
    )).toBe('0px')
  } finally {
    await standaloneContext.close()
  }
})

test('Touch-Landscape nutzt kompakten Dock und breitere Ontologie', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('http://127.0.0.1:5174/?mode=explore&preset=explorer')

    await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
    await expectBrainCanvas(page)
    await expect(page.getByTestId('structure-tree-panel')).toBeVisible()
    await expect.poll(async () => {
      const box = await page.getByTestId('structure-tree-panel').boundingBox()
      return Math.round(box?.width ?? 0)
    }).toBeGreaterThanOrEqual(390)
    await expect.poll(async () => (
      page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).display)
    )).toBe('flex')
    await expect.poll(async () => (
      page.locator('.ed-foot .flyout-icon').first().evaluate((element) => getComputedStyle(element).display)
    )).toBe('flex')
    await page.getByRole('button', { name: /Werkzeug/ }).tap()
    await expect(page.getByRole('button', { name: 'Verschieben' })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('Mobile Lernseite behaelt eine nutzbare 3D-Hoehe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?mode=learn&config=vcpt&scene=vcpt')

  await expect(page.getByRole('heading', { name: 'Visueller Konzentrationsverlaufstest (VCPT)' })).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await expect.poll(async () => {
    const box = await page.locator('.ed-foot').boundingBox()
    return Math.round(box?.height ?? 0)
  }).toBeLessThan(150)
  await expect.poll(async () => {
    const box = await page.locator('canvas').boundingBox()
    return box?.height ?? 0
  }).toBeGreaterThan(320)
})

test('Tablet-Narrow nutzt Drawer, aber noch kein Phone-Dock', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expectBrainCanvas(page)
  await expect(page.getByRole('button', { name: 'Strukturbaum öffnen' })).toBeVisible()
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).display)
  )).toBe('grid')
  await expect.poll(async () => (
    page.locator('.ed-foot .flyout-icon').first().evaluate((element) => getComputedStyle(element).display)
  )).toBe('none')
})

test('Desktop Footer bleibt Raster statt Mobile-Dock', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?mode=explore&preset=explorer')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Strukturbaum öffnen' })).toBeHidden()
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).display)
  )).toBe('grid')
  await expect.poll(async () => (
    page.locator('.ed-foot').evaluate((element) => getComputedStyle(element).overflowX)
  )).not.toBe('auto')
  await expect.poll(async () => (
    page.locator('.ed-foot .flyout-icon').first().evaluate((element) => getComputedStyle(element).display)
  )).toBe('none')
  await expect.poll(async () => {
    const box = await page.locator('.ed-foot > .col').first().boundingBox()
    return box?.width ?? 0
  }).toBeGreaterThan(100)
})

test('Snapshot-Import gewinnt gegen Config-Sichtbarkeitsdefaults', async ({ page }) => {
  await page.goto('/?config=p3a-konfliktmonitoring')

  await expect(page.getByRole('heading', { name: 'P3a — Konfliktmonitoring (No-go)' })).toBeVisible({ timeout: 60_000 })
  await expectMeshVisibility(page, { 'left-insula': false, 'right-insula': false })

  const snapshot = {
    version: 1,
    state: {
      route: { configName: 'p3a-konfliktmonitoring', sceneId: 'p3a-konfliktmonitoring', step: 0 },
      hidden: [],
    },
  }
  await page.getByLabel('Unterrichts-Snapshot-Datei').setInputFiles({
    name: 'visible-insula-snapshot.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  })
  await page.getByRole('button', { name: /Datei/ }).click()

  await expectMeshVisibility(page, { 'left-insula': true, 'right-insula': true })
})

test('Explorer-Deep-Link zeigt freie Strukturansicht ohne Presenter-Chrome', async ({ page }) => {
  await page.goto('/?mode=explore')

  await expect(page.getByText('Struktur anklicken')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByLabel('Szene springen')).toHaveCount(0)
  await expect(page.getByText('Strukturbaum').first()).toBeVisible()
  await expectBrainCanvas(page)
})

test('ungueltiger Mode-Deep-Link faellt auf den Startscreen zurueck', async ({ page }) => {
  await page.goto('/?mode=bogus')

  await expect(page.getByRole('heading', { name: 'Womit möchtest du starten?' })).toBeVisible()
  await expect(page.getByLabel('Szene springen')).toHaveCount(0)
})

test('korrupte lokale Atlas-Overrides zeigen einen Reset statt White-Screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('atlas-config-overrides', '{broken')
  })

  await page.goto('/?mode=explore')

  await expect(page.getByRole('heading', { name: 'Die App konnte nicht starten' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/JSON|atlas-config-overrides/i)).toBeVisible()

  await page.getByRole('button', { name: 'Lokale Einstellungen zurücksetzen' }).click()

  await expect(page.getByRole('heading', { name: 'Womit möchtest du starten?' })).toBeVisible({ timeout: 30_000 })
})
