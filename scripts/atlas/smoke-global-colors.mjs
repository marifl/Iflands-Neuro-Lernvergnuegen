// Browser-Smoke fuer globale Farbmodi: Anatomisch, Funktionssystem, Lateralitaet, Region.
// Prueft Sentinel-Meshes gegen den zentralen Farbvertrag und schreibt Screenshots.
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTsObject } from './build-config.mjs'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')
const workDir = resolve(here, 'work')
const colorSystemPath = resolve(appRoot, 'src/viewer/atlasColorSystem.ts')
const ANATOMICAL_MATERIAL_COLORS = loadTsObject(colorSystemPath, 'ANATOMICAL_MATERIAL_COLORS')
const FUNCTION_COLORS = loadTsObject(colorSystemPath, 'FUNCTION_COLORS')
const LATERALITY_COLORS = loadTsObject(colorSystemPath, 'LATERALITY_COLORS')
const REGION_COLORS = loadTsObject(colorSystemPath, 'REGION_COLORS')

const checks = {
  Anatomisch: {
    file: 'global-anatomisch.png',
    legend: 'Anatomische Materialien',
    expected: {
      'right-inferior-frontal-gyrus': ANATOMICAL_MATERIAL_COLORS['brain-cortex'],
      'right-lateral-ventricle': ANATOMICAL_MATERIAL_COLORS.csf,
      'corpus-callosum': ANATOMICAL_MATERIAL_COLORS['white-matter'],
      'left-anterior-cerebral-artery': ANATOMICAL_MATERIAL_COLORS.artery,
      'left-abducens-nerve': ANATOMICAL_MATERIAL_COLORS.nerve,
    },
  },
  Funktionssystem: {
    file: 'global-funktionssystem.png',
    legend: 'Funktionssysteme',
    expected: {
      'right-inferior-frontal-gyrus': FUNCTION_COLORS['executive-control'],
      'right-lateral-ventricle': FUNCTION_COLORS['csf-ventricular'],
      'corpus-callosum': FUNCTION_COLORS['white-matter-communication'],
      'left-anterior-cerebral-artery': FUNCTION_COLORS.vascular,
      'left-abducens-nerve': FUNCTION_COLORS['cranial-nerve'],
    },
  },
  'Lateralität': {
    file: 'global-lateralitaet.png',
    legend: 'Lateralität',
    expected: {
      'left-inferior-frontal-gyrus': LATERALITY_COLORS.left,
      'right-inferior-frontal-gyrus': LATERALITY_COLORS.right,
      'corpus-callosum': LATERALITY_COLORS.midline,
      'left-anterior-cerebral-artery': LATERALITY_COLORS.left,
    },
  },
  Region: {
    file: 'global-region.png',
    legend: 'Regionen',
    expected: {
      'right-inferior-frontal-gyrus': REGION_COLORS.telencephalon,
      'right-lateral-ventricle': REGION_COLORS.ventricles,
      'corpus-callosum': REGION_COLORS.commissures,
      'left-anterior-cerebral-artery': REGION_COLORS.vasculature,
      'left-abducens-nerve': REGION_COLORS['cranial-nerves'],
    },
  },
}

const viewports = [
  {
    label: 'Desktop',
    filePrefix: '',
    options: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  },
  {
    label: 'Mobile',
    filePrefix: 'mobile-',
    options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
]

async function waitBrain(page) {
  await page.waitForFunction(() => {
    const s = window.__THREE_SCENE__
    if (!s) return false
    let n = 0
    s.traverse((o) => { if (o.isMesh && o.name) n++ })
    return n > 100
  }, { timeout: 60000 })
}

async function visibleMeshColors(page, names) {
  return page.evaluate((want) => {
    const out = {}
    let root = window.__THREE_SCENE__
    while (root.parent) root = root.parent
    root.traverse((o) => {
      if (o.isMesh && want.includes(o.name) && o.visible && o.material?.color) {
        out[o.name] = `#${o.material.color.getHexString()}`
      }
    })
    return out
  }, names)
}

mkdirSync(workDir, { recursive: true })

const browser = await chromium.launch()

let fails = 0
const check = (cond, msg) => {
  if (cond) console.log(`  ok: ${msg}`)
  else {
    fails++
    console.log(`  FAIL: ${msg}`)
  }
}

for (const viewport of viewports) {
  const page = await browser.newPage(viewport.options)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/?mode=explore`, { waitUntil: 'domcontentloaded' })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
  await waitBrain(page)
  await page.waitForTimeout(1200)

  for (const [label, spec] of Object.entries(checks)) {
    console.log(`\nGlobal color mode / ${viewport.label} / ${label}`)
    await page.getByText(/^Farbe$/).click()
    await page.getByRole('button', { name: label }).click()
    await page.waitForTimeout(700)

    check(await page.getByText(spec.legend, { exact: true }).first().isVisible(), `Legende "${spec.legend}" ist sichtbar`)
    const colors = await visibleMeshColors(page, Object.keys(spec.expected))
    for (const [mesh, expected] of Object.entries(spec.expected)) {
      check(colors[mesh] === expected, `${mesh} nutzt ${expected} (ist ${colors[mesh] ?? 'nicht sichtbar'})`)
    }
    await page.screenshot({ path: resolve(workDir, `${viewport.filePrefix}${spec.file}`), fullPage: false })
  }

  check(pageErrors.length === 0, `${viewport.label}: keine Browser-pageerror (${pageErrors.length})`)
  await page.close()
}

await browser.close()

if (fails > 0) {
  console.error(`\nSMOKE FAILED: ${fails} Fehler`)
  process.exit(1)
}

console.log('\nSMOKE OK')
