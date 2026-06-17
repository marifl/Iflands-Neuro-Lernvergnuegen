import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const CASES = [
  {
    id: 'desktop-explorer-performance',
    path: '/?mode=explore&preset=explorer&perf=1',
    viewport: { width: 1366, height: 768 },
    hasTouch: false,
    budgets: {
      maxInitialLoadMs: 25000,
      minCanvasHeight: 420,
      minVisibleMeshes: 120,
      minNamedVisibleMeshes: 100,
      maxDrawCalls: 2500,
      maxTriangles: 10000000,
      maxAvgFrameMs: 120,
      maxMaxFrameMs: 500,
      maxPickLatencyMs: 250,
      minNonBlackPixels: 24,
      minColorBuckets: 4,
    },
  },
  {
    id: 'phone-portrait-explorer-performance',
    path: '/?mode=explore&preset=explorer&perf=1',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    budgets: {
      maxInitialLoadMs: 30000,
      minCanvasHeight: 250,
      minVisibleMeshes: 120,
      minNamedVisibleMeshes: 100,
      maxDrawCalls: 2500,
      maxTriangles: 10000000,
      maxAvgFrameMs: 140,
      maxMaxFrameMs: 650,
      maxPickLatencyMs: 300,
      minNonBlackPixels: 16,
      minColorBuckets: 4,
    },
  },
]

const browser = await chromium.launch()
let failures = 0

function pushBudget(errors, label, actual, limit, direction = 'max') {
  if (actual == null || Number.isNaN(actual)) {
    errors.push(`${label}=n/a`)
    return
  }
  if (direction === 'min' ? actual < limit : actual > limit) {
    errors.push(`${label}=${actual.toFixed ? actual.toFixed(1) : actual} budget=${limit}`)
  }
}

async function readStats(page) {
  return page.evaluate(() => {
    const stats = window.__brainPerformanceGate
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      stats,
      initialLoadMs: stats?.firstFrameAt == null ? null : stats.firstFrameAt - (nav?.startTime ?? 0),
    }
  })
}

async function waitForReadyStats(page) {
  await page.waitForFunction(() => {
    const stats = window.__brainPerformanceGate
    return Boolean(
      stats &&
      stats.frameCount >= 30 &&
      stats.visibleMeshes >= 120 &&
      stats.namedVisibleMeshes >= 100 &&
      stats.renderer.calls > 0 &&
      stats.renderer.triangles > 1000 &&
      stats.canvas.clientHeight > 0,
    )
  }, { timeout: 60000 })
}

async function canvasSample(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect()
    const sample = document.createElement('canvas')
    sample.width = 32
    sample.height = 32
    const context = sample.getContext('2d', { willReadFrequently: true })
    if (!context) return { ok: false, error: '2d-context-fehlt', width: rect.width, height: rect.height }
    try {
      context.drawImage(canvas, 0, 0, sample.width, sample.height)
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data
      const buckets = new Set()
      let nonBlackPixels = 0
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]
        if (a > 0 && r + g + b > 30) nonBlackPixels += 1
        buckets.add(`${r >> 4}:${g >> 4}:${b >> 4}:${a >> 4}`)
      }
      return {
        ok: true,
        width: rect.width,
        height: rect.height,
        nonBlackPixels,
        colorBuckets: buckets.size,
      }
    } catch (error) {
      return {
        ok: false,
        width: rect.width,
        height: rect.height,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}

async function canvasRect(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
}

async function mouseDrag(page, rect) {
  const y = rect.y + rect.height * 0.52
  await page.mouse.move(rect.x + rect.width * 0.36, y)
  await page.mouse.down()
  await page.mouse.move(rect.x + rect.width * 0.64, y, { steps: 12 })
  await page.mouse.up()
}

async function touchDrag(context, rect) {
  const client = await context.newCDPSession(context.pages()[0])
  const y = rect.y + rect.height * 0.52
  const start = { x: rect.x + rect.width * 0.36, y }
  const end = { x: rect.x + rect.width * 0.64, y }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...start, radiusX: 2, radiusY: 2, id: 1 }],
  })
  for (let step = 1; step <= 12; step += 1) {
    const t = step / 12
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        radiusX: 2,
        radiusY: 2,
        id: 1,
      }],
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function resetGate(page) {
  await page.evaluate(() => {
    window.__brainPerformanceGateReset?.()
  })
}

async function waitForFrames(page, minFrames) {
  await page.waitForFunction((frames) => (window.__brainPerformanceGate?.frameCount ?? 0) >= frames, minFrames, {
    timeout: 15000,
  })
}

async function waitForPick(page, beforeCount) {
  await page.waitForFunction((count) => (window.__brainPerformanceGate?.pick.count ?? 0) > count, beforeCount, {
    timeout: 15000,
  })
}

for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    hasTouch: testCase.hasTouch,
    isMobile: testCase.hasTouch,
  })
  const page = await context.newPage()
  const errors = []
  try {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-responsive-shell]', { timeout: 60000 })
    await page.waitForSelector('canvas', { timeout: 60000 })
    await waitForReadyStats(page)

    const initial = await readStats(page)
    const sample = await canvasSample(page)
    const stats = initial.stats
    if (!stats) errors.push('performance-gate-fehlt')
    if (!sample.ok) errors.push(`canvas-sample=${sample.error}`)

    pushBudget(errors, 'initialLoadMs', initial.initialLoadMs, testCase.budgets.maxInitialLoadMs)
    pushBudget(errors, 'canvasHeight', stats?.canvas.clientHeight, testCase.budgets.minCanvasHeight, 'min')
    pushBudget(errors, 'visibleMeshes', stats?.visibleMeshes, testCase.budgets.minVisibleMeshes, 'min')
    pushBudget(errors, 'namedVisibleMeshes', stats?.namedVisibleMeshes, testCase.budgets.minNamedVisibleMeshes, 'min')
    pushBudget(errors, 'drawCalls', stats?.renderer.calls, testCase.budgets.maxDrawCalls)
    pushBudget(errors, 'triangles', stats?.renderer.triangles, testCase.budgets.maxTriangles)
    pushBudget(errors, 'nonBlackPixels', sample.nonBlackPixels, testCase.budgets.minNonBlackPixels, 'min')
    pushBudget(errors, 'colorBuckets', sample.colorBuckets, testCase.budgets.minColorBuckets, 'min')

    await resetGate(page)
    const rect = await canvasRect(page)
    if (testCase.hasTouch) {
      await touchDrag(context, rect)
    } else {
      await mouseDrag(page, rect)
    }
    await waitForFrames(page, 24)
    const interaction = (await readStats(page)).stats
    pushBudget(errors, 'interactionAvgFrameMs', interaction?.avgFrameMs, testCase.budgets.maxAvgFrameMs)
    pushBudget(errors, 'interactionMaxFrameMs', interaction?.maxFrameMs, testCase.budgets.maxMaxFrameMs)

    await resetGate(page)
    const pickBefore = (await readStats(page)).stats?.pick.count ?? 0
    await page.mouse.click(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5)
    await waitForPick(page, pickBefore)
    const pick = (await readStats(page)).stats?.pick
    pushBudget(errors, 'pickLatencyMs', pick?.lastLatencyMs, testCase.budgets.maxPickLatencyMs)

    const summary = stats
      ? `initial=${initial.initialLoadMs?.toFixed(0)}ms canvas=${stats.canvas.clientWidth}x${stats.canvas.clientHeight} visible=${stats.visibleMeshes}/${stats.namedVisibleMeshes} draw=${stats.renderer.calls} triangles=${stats.renderer.triangles} frame=${interaction?.avgFrameMs.toFixed(1)}/${interaction?.maxFrameMs.toFixed(1)}ms pick=${pick?.lastLatencyMs?.toFixed(1)}ms nonblank=${sample.nonBlackPixels}/${sample.colorBuckets}`
      : 'stats=n/a'
    console.log(`${errors.length ? 'FAIL' : 'PASS'} ${testCase.id} ${summary}${errors.length ? ` | ${errors.join(' | ')}` : ''}`)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    console.log(`FAIL ${testCase.id} ${errors.join(' | ')}`)
  } finally {
    if (errors.length) failures += 1
    await context.close()
  }
}

await browser.close()
if (failures) process.exit(1)
