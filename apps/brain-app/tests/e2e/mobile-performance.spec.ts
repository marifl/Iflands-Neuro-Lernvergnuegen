import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const collectorPath = path.resolve(
  process.cwd(),
  '../../scripts/performance/collect_learn_runtime_metrics.mjs',
)

test('Runtime-Collector ist als versioniertes Playwright-Script vorhanden', async () => {
  expect(existsSync(collectorPath)).toBe(true)

  const source = readFileSync(collectorPath, 'utf8')
  expect(source).toContain('@playwright/test')
  expect(source).toContain('drawElements')
  expect(source).toContain('drawArrays')
})

test('Native Highqual Learn-Route liefert mobile Canvas-Metriken', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/learn?model=mni152-native-highqual-brain')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('missing canvas')
    }
    return {
      clientHeight: canvas.clientHeight,
      clientWidth: canvas.clientWidth,
      devicePixelRatio: window.devicePixelRatio,
      pixelHeight: canvas.height,
      pixelWidth: canvas.width,
    }
  })

  expect(metrics.clientWidth).toBeGreaterThan(0)
  expect(metrics.clientHeight).toBeGreaterThan(0)
  expect(metrics.pixelWidth).toBeGreaterThan(0)
  expect(metrics.pixelHeight).toBeGreaterThan(0)
  expect(metrics.devicePixelRatio).toBeGreaterThanOrEqual(1)
})
