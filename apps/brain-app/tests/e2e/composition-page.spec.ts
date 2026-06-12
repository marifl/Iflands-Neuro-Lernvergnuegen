import { expect, test } from '@playwright/test'

test('Composition route rendert Debugger mit Canvas und Region-Liste', async ({ page }) => {
  await page.goto('/composition')

  await expect(page.getByTestId('composition-page-header')).toBeVisible()
  await expect(page.getByRole('heading', { name: "IFLANDS NEURO ATLAS" })).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 20_000 })
})

test('Region-Fokus setzt URL-Parameter', async ({ page }) => {
  await page.goto('/composition')

  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Hirnstamm/i }).first().click()

  await expect(page).toHaveURL(/region=brainstem/)
})

test('Deep-Link oeffnet fokussierte Region', async ({ page }) => {
  await page.goto('/composition?region=hypothalamus')

  await expect(page).toHaveURL(/region=hypothalamus/)
  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /Hypothalamus/i }).first()).toHaveAttribute('aria-pressed', 'true')
})

test('Bereichs-Dropdown wechselt zu Quality', async ({ page }) => {
  await page.goto('/composition')

  await page.getByTestId('app-area-select').selectOption('/quality')
  await expect(page).toHaveURL(/\/quality$/)
  await expect(page.getByTestId('app-area-select')).toHaveValue('/quality')
})

test('Quality Deep-Link oeffnet Region-Detail', async ({ page }) => {
  await page.goto('/quality?region=hypothalamus')

  await expect(page.getByRole('heading', { name: "IFLANDS NEURO ATLAS" })).toBeVisible()
  await expect(page.getByTestId('quality-view-region-detail')).toHaveClass(/bg-black/)
})

test('Modell-Auswahl setzt Query-Parameter', async ({ page }) => {
  await page.goto('/composition')

  const select = page.getByTestId('brain-model-select')
  await expect(select).toBeVisible()
  await select.selectOption('mni152-native-highqual-brain-mobile-balanced')

  await expect(page).toHaveURL(/model=mni152-native-highqual-brain-mobile-balanced/)
  await expect(page.getByTestId('brain-model-select')).toHaveValue(
    'mni152-native-highqual-brain-mobile-balanced',
  )
  await expect(page.getByText(/Kein Composition-Naming/)).toHaveCount(0)
})

test('Legacy-Alias model=learn mappt auf aktuelles Native-HQ-Modell', async ({ page }) => {
  await page.goto('/composition?model=learn')

  await expect(page.getByTestId('brain-model-select')).toHaveValue('mni152-native-highqual-brain')
})

test('Manifest listet nur aktuelle Native-HQ-Modelle', async ({ page }) => {
  await page.goto('/composition')

  const select = page.getByTestId('brain-model-select')
  const options = select.locator('option')
  await expect(options).toHaveCount(4)
  await expect(options.nth(0)).toHaveAttribute('value', 'mni152-native-highqual-brain')
  await expect(options.nth(1)).toHaveAttribute('value', 'mni152-native-highqual-brain-mobile-balanced')
  await expect(options.nth(2)).toHaveAttribute('value', 'mni152-native-highqual-brain-desktop-balanced')
  await expect(options.nth(3)).toHaveAttribute('value', 'mni152-native-highqual-brain-cutplane-balanced')
})

test('Cut-Deep-Link setzt Y-Cut in URL und Sidebar', async ({ page }) => {
  await page.goto('/composition?cutY=-47')

  await expect(page).toHaveURL(/cutY=-47/)
  await expect(page.getByText('-47 mm')).toBeVisible({ timeout: 20_000 })
})

test('Cut-Ansicht rendert im Idle nicht permanent und begrenzt Cap-Helper', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as {
      __drawProbe: { drawElements: number; drawArrays: number; frames: number }
    }
    target.__drawProbe = { drawElements: 0, drawArrays: 0, frames: 0 }

    const originalRaf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      originalRaf((time) => {
        target.__drawProbe.frames += 1
        return callback(time)
      })

    const wrap = (proto: object | undefined, name: 'drawElements' | 'drawArrays') => {
      const methodHost = proto as
        | {
            [key in typeof name]?: ((...args: unknown[]) => unknown) & { __compositionProbeWrapped?: boolean }
          }
        | undefined
      const original = methodHost?.[name]
      if (!methodHost || !original || original.__compositionProbeWrapped) return
      const wrapped = function (this: unknown, ...args: unknown[]) {
        target.__drawProbe[name] += 1
        return original.apply(this, args)
      }
      wrapped.__compositionProbeWrapped = true
      methodHost[name] = wrapped
    }

    wrap(window.WebGLRenderingContext?.prototype, 'drawElements')
    wrap(window.WebGLRenderingContext?.prototype, 'drawArrays')
    wrap(window.WebGL2RenderingContext?.prototype, 'drawElements')
    wrap(window.WebGL2RenderingContext?.prototype, 'drawArrays')
  })

  await page.goto('/composition?model=mni152-native-highqual-brain&hide=none&cutY=-47')
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 60_000 })
  await page.getByTestId('composition-scene-loading').waitFor({ state: 'hidden', timeout: 120_000 })

  const statsHandle = await page.waitForFunction(() => {
    const target = window as unknown as {
      __compositionDebug?: { getStats: () => { cutHelperMeshes: number } }
    }
    const stats = target.__compositionDebug?.getStats()
    return stats && stats.cutHelperMeshes > 0 ? stats : null
  })
  const stats = (await statsHandle.jsonValue()) as { cutHelperMeshes: number }
  expect(stats.cutHelperMeshes).toBeLessThanOrEqual(300)

  await page.waitForTimeout(500)
  const before = await page.evaluate(() => {
    const target = window as unknown as {
      __drawProbe: { drawElements: number; drawArrays: number; frames: number }
    }
    return { ...target.__drawProbe }
  })
  await page.waitForTimeout(1_000)
  const after = await page.evaluate(() => {
    const target = window as unknown as {
      __drawProbe: { drawElements: number; drawArrays: number; frames: number }
    }
    return { ...target.__drawProbe }
  })

  const drawDelta = after.drawElements + after.drawArrays - before.drawElements - before.drawArrays
  const frameDelta = after.frames - before.frames
  expect(frameDelta).toBeLessThanOrEqual(5)
  expect(drawDelta).toBeLessThanOrEqual(6_000)
})

test('Cut-Zuruecksetzen entfernt URL-Parameter', async ({ page }) => {
  await page.goto('/composition?cutY=-47')

  await expect(page).toHaveURL(/cutY=-47/)
  await page.getByTestId('composition-reset-cuts').click()
  await expect(page).not.toHaveURL(/cutY=/)
})

test('Hide-Deep-Link zeigt alle Quellen sichtbar', async ({ page }) => {
  await page.goto('/composition?hide=none')

  await expect(page).toHaveURL(/hide=none/)
  await expect(page.getByTestId('composition-reset-visibility')).toBeVisible({ timeout: 20_000 })
})

test('Composition-Quellen zeigen keinen veralteten Eye-Drift-Hinweis', async ({ page }) => {
  await page.goto('/composition?hide=none')

  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Eye-GLB Y/Z-drift')).toHaveCount(0)
})

test('Sichtbarkeit-Standard setzt hide zurueck', async ({ page }) => {
  await page.goto('/composition?hide=none')

  await page.getByTestId('composition-reset-visibility').click()
  await expect(page).not.toHaveURL(/hide=/)
})

test('Copy-URL kopiert aktuelle Debug-Adresse', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/composition?cutY=-47')

  await page.getByTestId('composition-copy-url').click()
  await expect(page.getByTestId('composition-copy-url')).toContainText('Kopiert')

  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('cutY=-47')
})

test('Canvas-Pick zeigt Mesh im Picker', async ({ page }) => {
  await page.goto('/composition')

  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('composition-scene-loading')).toBeHidden()

  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas bounding box fehlt')

  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.45 } })
  await expect(page.locator('aside').getByText('Mesh:').first()).toBeVisible({ timeout: 10_000 })
})

test('Sidebar laesst sich einklappen', async ({ page }) => {
  await page.goto('/composition')
  const sidebar = page.getByTestId('composition-sidebar')

  await page.getByTestId('composition-sidebar-toggle').click()
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThanOrEqual(2)

  await page.getByTestId('composition-sidebar-toggle').click()
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeGreaterThan(200)
})

test('Region-Klick waehlt Repraesentant-Mesh im Picker', async ({ page }) => {
  await page.goto('/composition')

  await expect(page.getByText(/Regionen:/)).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /Hypothalamus/i }).first().click()

  await expect(page.getByTestId('composition-picker-panel').getByText('Mesh:')).toBeVisible()
  await expect(page.getByTestId('composition-picker-panel')).toContainText('hypothalamus')
})

test('Tastenkuerzel-Hilfe ist aufklappbar', async ({ page }) => {
  await page.goto('/composition')

  await expect(page.getByTestId('composition-shortcuts-help')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('composition-shortcuts-help').getByRole('button', { name: /Tastenkuerzel/i }).click()
  await expect(page.getByText('Shift + Pfeile')).toBeVisible()
})
