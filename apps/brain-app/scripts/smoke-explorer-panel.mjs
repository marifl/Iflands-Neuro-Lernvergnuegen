import { launchSmokeBrowser } from './smokeBrowser.mjs'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const CASES = [
  {
    id: 'desktop-explorer-panel',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
    openDrawer: false,
  },
  {
    id: 'phone-portrait-explorer-drawer',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    openDrawer: true,
  },
  {
    id: 'phone-landscape-explorer-rail',
    path: '/?mode=explore&preset=explorer',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    openDrawer: false,
  },
]

const browser = await launchSmokeBrowser()
let failures = 0
const GAGE_ASSET_IDS = [
  'phineas-gage-skull-base',
  'phineas-gage-skull-calvaria',
  'phineas-gage-iron-rod',
]
const GAGE_TREE_SEARCHES = [
  { query: 'Schädelbasis', label: 'Gage-Schädelbasis' },
  { query: 'Calvaria', label: 'Gage-Calvaria' },
  { query: 'Eisenstange', label: 'Gage-Eisenstange' },
]

async function assertGageViewportAssets(page, errors) {
  await page.waitForSelector('canvas', { timeout: 60000 })
  await page.waitForFunction((assetIds) => {
    const snapshot = window.__manifestAssetObjects
    return Boolean(
      snapshot &&
      snapshot.groupName === 'manifest-asset-objects' &&
      assetIds.every((assetId) => {
        const asset = snapshot.assets?.[assetId]
        return asset &&
          asset.visible === true &&
          asset.meshCount >= 1 &&
          asset.visibleMeshCount >= 1 &&
          asset.pickableMeshCount >= 1 &&
          asset.objectGraphIds?.length >= 1
      }),
    )
  }, GAGE_ASSET_IDS, { timeout: 60000 })

  const snapshot = await page.evaluate((assetIds) => {
    const assets = window.__manifestAssetObjects?.assets ?? {}
    return Object.fromEntries(assetIds.map((assetId) => [assetId, assets[assetId] ?? null]))
  }, GAGE_ASSET_IDS)

  for (const assetId of GAGE_ASSET_IDS) {
    const asset = snapshot[assetId]
    if (!asset) {
      errors.push(`${assetId}=fehlt-im-viewport`)
      continue
    }
    if (asset.collectionId !== 'case-phineas-gage') errors.push(`${assetId}.collectionId=${asset.collectionId}`)
    if (!asset.instanceId) errors.push(`${assetId}.instanceId=fehlt`)
    if (asset.visible !== true) errors.push(`${assetId}.visible=${asset.visible}`)
    if (asset.visibleMeshCount < 1) errors.push(`${assetId}.visibleMeshCount=${asset.visibleMeshCount}`)
    if (asset.pickableMeshCount < 1) errors.push(`${assetId}.pickableMeshCount=${asset.pickableMeshCount}`)
    if (!asset.objectGraphIds?.some((id) => id.includes(asset.instanceId))) {
      errors.push(`${assetId}.objectGraphIds=${asset.objectGraphIds?.join(',') ?? 'n/a'}`)
    }
  }
}

for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    hasTouch: testCase.hasTouch,
  })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await assertGageViewportAssets(page, errors)

    if (testCase.openDrawer) {
      await page.getByRole('button', { name: 'Strukturbaum öffnen' }).click()
      await page.waitForSelector('[data-testid="mobile-structure-drawer"]', { timeout: 10000 })
    } else {
      await page.waitForSelector('[data-testid="structure-tree-panel"]', { timeout: 60000 })
    }

    const panel = testCase.openDrawer
      ? page.getByTestId('mobile-structure-drawer')
      : page.getByTestId('structure-tree-panel')

    const search = panel.getByPlaceholder('Struktur suchen…')
    await search.waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Roh-Atlas-Overlay' }).waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Carve-Atlas-Overlay' }).waitFor({ timeout: 10000 })
    await panel.getByRole('group', { name: 'Schnitte' }).waitFor({ timeout: 10000 })
    await panel.getByText('Phineas Gage').waitFor({ timeout: 10000 })
    for (const treeSearch of GAGE_TREE_SEARCHES) {
      await search.fill(treeSearch.query)
      await panel.getByRole('button', { name: treeSearch.label }).waitFor({ timeout: 10000 })
    }
    await search.fill('')

    const disabledSelection = panel.getByRole('button', { name: 'Auswahl ausblenden' }).first()
    const ariaDisabled = await disabledSelection.getAttribute('aria-disabled')
    if (ariaDisabled !== 'true') errors.push(`selection-aria-disabled=${ariaDisabled}`)
    const nativeDisabled = await disabledSelection.evaluate((button) => button instanceof HTMLButtonElement && button.disabled)
    if (nativeDisabled) errors.push('selection-native-disabled')
    const disabledReason = await panel.getByText('Erst eine Struktur auswählen').first().isVisible()
    if (!disabledReason) errors.push('selection-disabled-reason-fehlt')

    const sagittal = panel.getByRole('button', { name: 'Sagittal' })
    const cutAxis = await sagittal.getAttribute('data-cut-axis')
    if (cutAxis !== 'sagittal') errors.push(`cut-axis=${cutAxis}`)

    await sagittal.click()
    await panel.getByLabel('Schnittposition Sagittal').waitFor({ timeout: 10000 })

    const overflowX = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )
    if (overflowX > 1) errors.push(`overflowX=${overflowX}`)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    await context.close()
  }

  if (errors.length) failures++
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${testCase.id} ${errors.join(' | ')}`)
}

await browser.close()
if (failures) process.exit(1)
