import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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
  const snapshot = {
    version: 1,
    state: {
      authoring: {
        schemaVersion: 1,
        registryContext: {
          collectionIds: ['device-eeg-10-20'],
          bonusContextIds: ['eeg-erp-vcpt'],
        },
        authoringScenes: [
          {
            schemaVersion: 1,
            sceneId: 'vcpt-device-authoring',
            assetInstances: [
              {
                instanceId: 'eeg-cap-01',
                assetId: 'asset:eeg-cap',
                collectionId: 'device-eeg-10-20',
                visible: true,
                transform: { position: [0, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
                origin: { policy: 'asset-origin' },
                parts: [{ partId: 'electrode-fz', label: 'Fz electrode', pickable: true, role: 'selectable' }],
              },
            ],
          },
        ],
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
