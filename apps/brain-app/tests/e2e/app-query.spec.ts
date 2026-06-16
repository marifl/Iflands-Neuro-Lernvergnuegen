import { expect, test, type Page } from '@playwright/test'

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
