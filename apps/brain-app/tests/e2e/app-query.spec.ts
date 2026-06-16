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

test('Startscreen startet den Lernmodus', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Womit möchtest du starten?' })).toBeVisible()
  await page.getByRole('button', { name: /^Lernen/ }).click()

  await expect(page.getByLabel('Szene springen')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Go-/No-go-Aufgaben — Reaktion hemmen' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Drei Basalganglien-Schleifen' })).toBeVisible()
  await expect(page).toHaveURL(/sequence=presentation\.kapitel11-vorlesung/)
  await expect(page).toHaveURL(/config=basalganglienschleifen/)
  await expect(page).toHaveURL(/scene=basalganglienschleifen/)

  await page.keyboard.press('ArrowRight')

  await expect(page.getByRole('heading', { name: 'Broca-Areal — Area 44/45 als VLPFC-Anker' })).toBeVisible()
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

test('Authoring-Snapshot roundtript Device-State ueber Import und Export', async ({ page }) => {
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
    position: [0, 1.2, 0],
    rotation: [0, 0.25, 0],
    scale: [0.8, 0.8, 0.8],
  })
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
