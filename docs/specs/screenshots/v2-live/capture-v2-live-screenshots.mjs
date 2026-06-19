import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../../../../apps/brain-app/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173'
const OUT_DIR = new URL('./', import.meta.url)

const cases = [
  {
    file: '01-mobile-launcher.png',
    surface: 'Start / launcher',
    path: '/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    waitForText: /Lernen|Explorer|Phineas|Atlas/,
    dartScope: 'iBJCrwzOMeU6 / I3SsEI0tLcqq',
    frames: ['LauncherFrame.dc.html', 'Device Matrix - Launcher Faelle Onboarding v2.dc.html'],
  },
  {
    file: '02-mobile-learning-step.png',
    surface: 'Learning step',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    waitForSelector: '[aria-label=\"Szene springen\"]',
    dartScope: 'I3SsEI0tLcqq / 1rYGOyvdhRm8',
    frames: ['AppFrame.dc.html', 'Viewport 3D v2.dc.html'],
  },
  {
    file: '03-mobile-explorer-drawer.png',
    surface: 'Explorer supplement / mobile drawer',
    path: '/?mode=explore',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    action: 'open-structure-drawer',
    dartScope: 'I3SsEI0tLcqq / EQrweA6CmVE8',
    frames: ['ExplorerToolsFrame.dc.html', 'Device Matrix v2.dc.html'],
  },
  {
    file: '04-mobile-phineas-case.png',
    surface: 'Case supplement / Phineas',
    path: '/?mode=phineas',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    waitForText: /Phineas|Gage/,
    dartScope: 'I3SsEI0tLcqq / dSfvOVH6Dwoq',
    frames: ['FaelleFrame.dc.html', 'FaelleBrowserFrame.dc.html'],
  },
  {
    file: '05-mobile-atlas-supplement.png',
    surface: 'Atlas supplement',
    path: '/?mode=atlas',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    waitForText: /Atlas|DKT|Brodmann|Destrieux/,
    dartScope: 'I3SsEI0tLcqq / AtlasErpFrame.dc.html',
    frames: ['AtlasErpFrame.dc.html'],
  },
  {
    file: '06-mobile-landscape-learning.png',
    surface: 'Phone landscape learning',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    waitForSelector: '[aria-label=\"Szene springen\"]',
    dartScope: 'I3SsEI0tLcqq / HfDyMF0aT88a',
    frames: ['AppFrame.dc.html', 'Device Matrix v2.dc.html'],
  },
  {
    file: '07-tablet-portrait-learning.png',
    surface: 'Tablet portrait learning',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
    waitForSelector: '[aria-label=\"Szene springen\"]',
    dartScope: 'I3SsEI0tLcqq / HfDyMF0aT88a',
    frames: ['Device Matrix v2.dc.html'],
  },
  {
    file: '08-tablet-landscape-explorer.png',
    surface: 'Tablet landscape explorer',
    path: '/?mode=explore',
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    waitForSelector: '[data-testid=\"structure-tree-panel\"]',
    dartScope: 'I3SsEI0tLcqq / EQrweA6CmVE8',
    frames: ['ExplorerToolsFrame.dc.html', 'Device Matrix v2.dc.html'],
  },
  {
    file: '09-ipad-pro-portrait-learning.png',
    surface: 'Large tablet portrait learning',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 834, height: 1194 },
    hasTouch: true,
    waitForSelector: '[aria-label=\"Szene springen\"]',
    dartScope: 'I3SsEI0tLcqq / HfDyMF0aT88a',
    frames: ['Device Matrix v2.dc.html'],
  },
  {
    file: '10-ipad-pro-landscape-atlas.png',
    surface: 'Large tablet landscape atlas',
    path: '/?mode=atlas',
    viewport: { width: 1194, height: 834 },
    hasTouch: true,
    waitForText: /Atlas|DKT|Brodmann|Destrieux/,
    dartScope: 'I3SsEI0tLcqq / AtlasErpFrame.dc.html',
    frames: ['AtlasErpFrame.dc.html'],
  },
  {
    file: '11-large-tablet-portrait-phineas.png',
    surface: 'Large tablet portrait Phineas',
    path: '/?mode=phineas',
    viewport: { width: 1024, height: 1366 },
    hasTouch: true,
    waitForText: /Phineas|Gage/,
    dartScope: 'I3SsEI0tLcqq / dSfvOVH6Dwoq',
    frames: ['FaelleFrame.dc.html'],
  },
  {
    file: '12-large-tablet-landscape-explorer.png',
    surface: 'Large tablet landscape explorer',
    path: '/?mode=explore',
    viewport: { width: 1366, height: 1024 },
    hasTouch: true,
    waitForSelector: '[data-testid=\"structure-tree-panel\"]',
    dartScope: 'I3SsEI0tLcqq / EQrweA6CmVE8',
    frames: ['ExplorerToolsFrame.dc.html'],
  },
  {
    file: '13-desktop-learning-step.png',
    surface: 'Desktop learning step',
    path: '/?mode=learn&config=vcpt&scene=vcpt',
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    waitForSelector: '[aria-label=\"Szene springen\"]',
    dartScope: 'I3SsEI0tLcqq / 1rYGOyvdhRm8',
    frames: ['AppFrame.dc.html', 'Viewport 3D v2.dc.html'],
  },
  {
    file: '14-desktop-explorer-supplement.png',
    surface: 'Desktop explorer supplement',
    path: '/?mode=explore',
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    waitForSelector: '[data-testid=\"structure-tree-panel\"]',
    dartScope: 'I3SsEI0tLcqq / EQrweA6CmVE8',
    frames: ['ExplorerToolsFrame.dc.html'],
  },
  {
    file: '15-desktop-atlas-supplement.png',
    surface: 'Desktop atlas supplement',
    path: '/?mode=atlas',
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    waitForText: /Atlas|DKT|Brodmann|Destrieux/,
    dartScope: 'I3SsEI0tLcqq / AtlasErpFrame.dc.html',
    frames: ['AtlasErpFrame.dc.html'],
  },
]

async function waitForCase(page, item) {
  await page.goto(`${BASE}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  if (item.waitForSelector) await page.waitForSelector(item.waitForSelector, { timeout: 90_000 })
  if (item.waitForText) await page.getByText(item.waitForText).first().waitFor({ timeout: 90_000 })
  await page.waitForTimeout(1800)
  if (item.action === 'open-structure-drawer') {
    const button = page.getByRole('button', { name: /Strukturbaum/ }).first()
    await button.click({ timeout: 10_000 })
    await page.waitForSelector('[data-testid=\"mobile-structure-drawer\"]', { timeout: 20_000 })
    await page.waitForTimeout(400)
  }
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-responsive-shell]')
    const canvas = document.querySelector('canvas')
    const canvasBox = canvas?.getBoundingClientRect()
    const text = document.body.innerText
    return {
      shell: shell?.getAttribute('data-responsive-shell') ?? null,
      canvas: canvasBox ? {
        width: Math.round(canvasBox.width),
        height: Math.round(canvasBox.height),
      } : null,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      debugVisible: /debug|raw atlas|authoring|admin/i.test(text),
      bodyTextSample: text.replace(/\\s+/g, ' ').trim().slice(0, 180),
    }
  })
}

const browser = await chromium.launch()
const results = []
let failures = 0

for (const item of cases) {
  const context = await browser.newContext({
    viewport: item.viewport,
    hasTouch: item.hasTouch,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const errors = []
  try {
    await waitForCase(page, item)
    const inspection = await inspectPage(page)
    if (inspection.overflowX > 1) errors.push(`overflowX=${inspection.overflowX}`)
    if (!inspection.canvas && item.path !== '/') errors.push('canvas=missing')
    await page.screenshot({ path: fileURLToPath(new URL(item.file, OUT_DIR)), fullPage: false })
    results.push({ ...item, status: errors.length ? 'WARN' : 'PASS', inspection, errors })
  } catch (error) {
    failures += 1
    const message = error instanceof Error ? error.message : String(error)
    results.push({ ...item, status: 'FAIL', inspection: null, errors: [message] })
  } finally {
    await context.close()
  }
  console.log(`${results.at(-1).status} ${item.file} ${results.at(-1).errors.join(' | ')}`)
}

await browser.close()

await writeFile(new URL('capture-summary.json', OUT_DIR), JSON.stringify(results, null, 2))

if (failures) process.exit(1)
