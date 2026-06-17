import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173'

const CASES = [
  {
    id: 'desktop-explorer',
    path: '/?mode=explore',
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    shell: 'desktop-split',
    flexDirection: 'row',
    inlineTree: true,
    drawerButton: false,
  },
  {
    id: 'tablet-portrait-explorer',
    path: '/?mode=explore',
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
    shell: 'portrait-drawer',
    flexDirection: 'column',
    inlineTree: false,
    drawerButton: true,
  },
  {
    id: 'phone-portrait-learn',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    shell: 'portrait-drawer',
    flexDirection: 'column',
    inlineTree: false,
    drawerButton: false,
    waitFor: '[aria-label="Szene springen"]',
  },
  {
    id: 'phone-landscape-learn',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    shell: 'landscape-rail',
    flexDirection: 'row',
    inlineTree: false,
    drawerButton: false,
    waitFor: '[aria-label="Szene springen"]',
  },
  {
    id: 'phone-landscape-explorer',
    path: '/?mode=explore',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    shell: 'landscape-rail',
    flexDirection: 'row',
    inlineTree: true,
    drawerButton: false,
  },
  {
    id: 'tablet-landscape-phineas',
    path: '/?mode=phineas',
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    shell: 'landscape-rail',
    flexDirection: 'row',
    inlineTree: false,
    drawerButton: false,
  },
]

const browser = await chromium.launch()
let failures = 0

async function count(locator) {
  return locator.count()
}

async function visibleTreeCount(page) {
  return count(page.locator('[data-testid="structure-tree-panel"]'))
}

async function measure(page) {
  return page.locator('[data-responsive-shell]').evaluate((shell) => ({
    shell: shell.getAttribute('data-responsive-shell'),
    flexDirection: getComputedStyle(shell).flexDirection,
    overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  }))
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
    if (testCase.waitFor) {
      await page.waitForSelector(testCase.waitFor, { timeout: 60000 })
    }
    const actual = await measure(page)
    if (actual.shell !== testCase.shell) errors.push(`shell=${actual.shell}`)
    if (actual.flexDirection !== testCase.flexDirection) errors.push(`flex=${actual.flexDirection}`)
    if (actual.overflowX > 1) errors.push(`overflowX=${actual.overflowX}`)

    const drawerButton = page.getByRole('button', { name: /Strukturbaum/ })
    const drawerButtonVisible = await count(drawerButton)
    if (testCase.drawerButton && drawerButtonVisible === 0) errors.push('drawer-button-fehlt')
    if (!testCase.drawerButton && drawerButtonVisible > 0) errors.push('drawer-button-unerwartet')

    if (testCase.inlineTree) {
      await page.waitForSelector('[data-testid="structure-tree-panel"]', { timeout: 60000 })
    }
    const treeCount = await visibleTreeCount(page)
    if (testCase.inlineTree && treeCount === 0) errors.push('inline-tree-fehlt')
    if (!testCase.inlineTree && treeCount > 0) errors.push('inline-tree-unerwartet')

    if (testCase.drawerButton) {
      await drawerButton.first().click()
      await page.waitForSelector('[data-testid="mobile-structure-drawer"]', { timeout: 10000 })
    }
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
