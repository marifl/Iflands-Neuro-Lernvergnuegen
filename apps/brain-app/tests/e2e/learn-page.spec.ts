import { expect, test } from '@playwright/test'

test('Learn route rendert Atlas-Shell mit 3D-Canvas und Ontologiebaum', async ({ page }) => {
  await page.goto('/learn')

  await expect(page.getByText("IFLANDS NEURO ATLAS")).toBeVisible()
  await expect(page.getByText('STRUKTUREN')).toBeVisible()
  await expect(page.locator('[data-region-id="brain__cortex"]')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 })
})

test('Bereichs-Dropdown ist auf Learn sichtbar', async ({ page }) => {
  await page.goto('/learn')

  await expect(page.getByTestId('app-area-select')).toBeVisible()
  await expect(page.getByTestId('app-area-select')).toHaveValue('/learn')
})

test('Modell-Dropdown setzt Query-Parameter auf Learn', async ({ page }) => {
  await page.goto('/learn')

  await page.getByTestId('brain-model-select').selectOption('mni152-native-highqual-brain-mobile-balanced')
  await expect(page).toHaveURL(/model=mni152-native-highqual-brain-mobile-balanced/)
  await expect(page.getByTestId('brain-model-select')).toHaveValue(
    'mni152-native-highqual-brain-mobile-balanced',
  )
})

test('Struktursuche filtert den Ontologiebaum', async ({ page }) => {
  await page.goto('/learn')

  await page.getByTestId('region-tree-search').fill('Amygdala')
  await expect(page.getByRole('button', { name: /Amygdala/i }).first()).toBeVisible()
  await expect(page.locator('[data-region-id="brain__cortex"]')).toBeHidden()
})

test('Tastenkuerzel-Hilfe ist in der Sidebar aufklappbar', async ({ page }) => {
  await page.goto('/learn')

  await expect(page.getByTestId('learn-shortcuts-help')).toBeVisible()
  await page.getByTestId('learn-shortcuts-help').getByRole('button', { name: 'Tastenkuerzel' }).click()
  await expect(page.getByText('Struktursuche fokussieren')).toBeVisible()
})

test('Leere Struktursuche zeigt Hinweis', async ({ page }) => {
  await page.goto('/learn')

  await page.getByTestId('region-tree-search').fill('zzznomatchxyz')
  await expect(page.getByTestId('region-tree-search-empty')).toBeVisible()
  await page.getByTestId('region-tree-search-clear').click()
  await expect(page.getByTestId('region-tree-search')).toHaveValue('')
})

test('Quality-Header nutzt einheitliches App-Layout', async ({ page }) => {
  await page.goto('/quality')

  await expect(page.getByTestId('quality-page-header')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'IFLANDS NEURO ATLAS' })).toBeVisible()
  await expect(page.getByTestId('quality-view-matrix')).toBeVisible()
})

test('Ontologieauswahl oeffnet die Region-Karte', async ({ page }) => {
  await page.goto('/learn')

  await page.locator('[data-region-id="brain__cortex"]').click()

  await expect(page.locator('h2', { hasText: 'Grosshirnrinde' })).toBeVisible()
  await expect(page.getByTestId('region-card')).toBeVisible()
  await expect(page.getByText('Detaillierter Content wird vorbereitet.')).toBeVisible()
})

test('Strukturbaum kann geschlossen und wieder geoeffnet werden', async ({ page }) => {
  await page.goto('/learn')
  const sidebar = page.locator('aside').first()

  await page.getByRole('button', { name: 'Baum schliessen' }).click()
  await expect(page.getByRole('button', { name: 'Baum oeffnen' })).toBeVisible()
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThanOrEqual(2)

  await page.getByRole('button', { name: 'Baum oeffnen' }).click()
  await expect(page.getByRole('button', { name: 'Baum schliessen' })).toBeVisible()
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeGreaterThan(200)
  await expect(page.getByText('STRUKTUREN')).toBeVisible()
})

test('Dev-Demo-Controls bleiben bedienbar', async ({ page }) => {
  await page.goto('/learn')

  await expect(page.getByTestId('view-demo-panel')).toBeVisible()
  await page.getByRole('button', { name: 'M1 (precentral BA-4)' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()

  await expect(page.locator('canvas')).toBeVisible()
})

test('View Demo laesst sich ausblenden und wieder oeffnen', async ({ page }) => {
  await page.goto('/learn')

  await expect(page.getByTestId('view-demo-panel')).toBeVisible()
  await page.getByTestId('view-demo-hide').click()
  await expect(page.getByTestId('view-demo-panel')).toBeHidden()
  await expect(page.getByTestId('view-demo-restore')).toBeVisible()

  await page.getByTestId('view-demo-restore').click()
  await expect(page.getByTestId('view-demo-panel')).toBeVisible()
})

test('Legacy-Deck-Route wird nicht wiederbelebt', async ({ page }) => {
  await page.goto('/deck?slide=S01')

  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByText("IFLANDS NEURO ATLAS")).toBeVisible()
})

test('Meningen-Overlay ist im Strukturbaum und standardmaessig ausgeblendet', async ({ page }) => {
  await page.goto('/learn')

  await page.getByTestId('region-tree-search').fill('Meningen & Liquor')
  const rootBtn = page.locator('[data-region-id="brain__meningeal-liquor"]')
  const rootRow = page.locator('[data-region-row-id="brain__meningeal-liquor"]')
  await expect(rootBtn).toBeVisible()
  await expect(rootRow).toHaveClass(/opacity-40/)

  await page.getByTestId('region-tree-search').fill('Gefäßsystem')
  await expect(page.getByRole('button', { name: /Gefäßsystem/i }).first()).toBeVisible()

  await page.getByTestId('region-tree-search').fill('Subarachnoidal')
  await expect(page.locator('[data-region-id="brain__meningeal-liquor__meningen"]')).toBeVisible()
})

test('Strukturbaum bleibt bei vielen Eintraegen bis zum Ende scrollbar', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.goto('/learn')

  const list = page.getByTestId('region-tree-list')
  await expect(list).toBeVisible()

  await expect.poll(async () => {
    return await list.evaluate((element) => element.scrollHeight > element.clientHeight)
  }).toBe(true)

  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  await expect(page.locator('[data-region-id="brain__meningeal-liquor__gefaesse"]')).toBeVisible()
})

test('Strukturbaum markiert die Elternkette getrennt vom aktiven Knoten', async ({ page }) => {
  await page.goto('/learn')

  const child = page.locator('[data-region-id="brain__meningeal-liquor__gefaesse"]')
  await child.click()

  await expect(child).toHaveAttribute('data-selection-state', 'selected')
  await expect(page.locator('[data-region-id="brain__meningeal-liquor"]')).toHaveAttribute(
    'data-selection-state',
    'ancestor',
  )
})

test('Expander-Zone klappt Knoten auf ohne ihn auszuwaehlen', async ({ page }) => {
  await page.goto('/learn')

  const node = page.locator('[data-region-id="brain__cortex__frontallappen"]')
  const expander = page.locator('[data-region-expander-id="brain__cortex__frontallappen"]')
  const child = page.locator('[data-region-id="brain__cortex__frontallappen__paracentral-l"]')

  await expect(expander).toBeVisible()
  await expect(child).toBeHidden()

  await expander.click()

  await expect(child).toBeVisible()
  await expect(node).toHaveAttribute('data-selection-state', 'none')

  await node.click()
  await expect(node).toHaveAttribute('data-selection-state', 'selected')
})

test('Sidebar-Baum nutzt touch-taugliche getrennte Zielzonen', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto('/learn')

  const expander = page.locator('[data-region-expander-id="brain__cortex__frontallappen"]')
  const selector = page.locator('[data-region-id="brain__cortex__frontallappen"]')

  const metrics = await Promise.all([
    expander.boundingBox(),
    selector.boundingBox(),
  ])
  const [expanderBox, selectorBox] = metrics
  expect(expanderBox?.width ?? 0).toBeGreaterThanOrEqual(40)
  expect(expanderBox?.height ?? 0).toBeGreaterThanOrEqual(40)
  expect(selectorBox?.height ?? 0).toBeGreaterThanOrEqual(40)
  expect(selectorBox?.width ?? 0).toBeGreaterThan((expanderBox?.width ?? 0) * 2)
})
