// Config-getriebener Smoke: prueft Figure-Faerbungen aus atlas-config.json.
// Erwartete Figuren, Presets, Buckets und Meshes kommen aus atlas-config.json,
// nicht aus einer zweiten Preset- oder Mapping-Liste im Test.
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../../apps/brain-app')
const appRequire = createRequire(resolve(appRoot, 'package.json'))
const { chromium } = appRequire('@playwright/test')
const appPublic = resolve(appRoot, 'public')
const colorSystemSource = readFileSync(resolve(appRoot, 'src/viewer/atlasColorSystem.ts'), 'utf8')
const config = JSON.parse(readFileSync(resolve(appPublic, 'assets/atlas-canonical/atlas-config.json'), 'utf8'))
const colorPresets = new Map(Object.entries(config.color_presets ?? {}).map(([id, preset]) => [id, { id, ...preset }]))

function exportedNumber(name) {
  const match = colorSystemSource.match(new RegExp(`export const ${name} = ([0-9.]+)`))
  if (!match) throw new Error(`smoke-figures: ${name} fehlt in atlasColorSystem.ts`)
  return Number(match[1])
}

const PRESET_HUE_SATURATION = exportedNumber('PRESET_HUE_SATURATION')
const PRESET_HUE_LIGHTNESS = exportedNumber('PRESET_HUE_LIGHTNESS')
const PRESET_COLOR_EMISSIVE_INTENSITY = exportedNumber('PRESET_COLOR_EMISSIVE_INTENSITY')

function hueToHex(hue, sat = PRESET_HUE_SATURATION, light = PRESET_HUE_LIGHTNESS) {
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const hp = (((hue % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const hex = (value) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function bucketMeshes(bucket) {
  const mapping = config.mesh_mappings.buckets[bucket]
  if (!mapping) throw new Error(`smoke-figures: Bucket "${bucket}" fehlt in Runtime-Config`)
  if (mapping.meshes.length === 0) throw new Error(`smoke-figures: Bucket "${bucket}" hat keine Geometrie`)
  return mapping.meshes
}

function figureConfigs() {
  return Object.entries(config.configurations)
    .filter(([, cfg]) => cfg.colors?.scheme === 'preset' && cfg.colors?.enabled !== false)
    .map(([name, cfg]) => {
      if (!cfg.colors?.preset) throw new Error(`smoke-figures: Color-Figure-Config "${name}" braucht colors.preset oder colors.enabled=false`)
      if (!cfg.regions?.buckets?.length) throw new Error(`smoke-figures: Color-Figure-Config "${name}" braucht regions.buckets oder colors.enabled=false`)
      const preset = colorPresets.get(cfg.colors.preset)
      if (!preset) throw new Error(`smoke-figures: Config "${name}" referenziert unbekanntes Preset "${cfg.colors.preset}"`)
      return { name, cfg, preset }
    })
}

function expectationsFor(figure) {
  const rows = []
  const usedBuckets = new Set(figure.cfg.regions.buckets)
  const missingBuckets = [...usedBuckets].filter((bucket) => !figure.preset.groups.some((group) => group.buckets.includes(bucket)))
  if (missingBuckets.length > 0) {
    throw new Error(`smoke-figures: Config "${figure.name}" nutzt Preset "${figure.preset.id}" ohne Buckets: ${missingBuckets.join(', ')}`)
  }
  for (const bucket of figure.cfg.regions.buckets) {
    const group = figure.preset.groups.find((candidate) => candidate.buckets.includes(bucket))
    if (!group) {
      throw new Error(`smoke-figures: Config "${figure.name}" Bucket "${bucket}" fehlt in Preset "${figure.preset.id}"`)
    }
    rows.push({ bucket, groupLabel: group.label, expectedColor: hueToHex(group.hue), meshes: bucketMeshes(bucket) })
  }
  return rows
}

function figureUrl(figure) {
  const params = new URLSearchParams()
  const { learning, presentation } = figure.cfg.sequencing ?? {}
  if (learning) params.set('sequence', `learning.${learning}`)
  else if (presentation) params.set('sequence', `presentation.${presentation}`)
  params.set('config', figure.name)
  if (figure.cfg.overlay?.scene) {
    params.set('scene', figure.cfg.overlay.scene)
    params.set('step', '0')
  }
  return `${BASE}/?${params}`
}

async function waitBrain(page) {
  await page.waitForFunction(() => {
    const s = window.__THREE_SCENE__
    if (!s) return false
    let n = 0
    s.traverse((o) => { if (o.isMesh && o.name) n++ })
    return n > 100
  }, { timeout: 60000 })
}

const meshStates = (page, names) => page.evaluate((want) => {
  const out = {}
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  root.traverse((o) => {
    if (o.isMesh && want.includes(o.name) && o.visible) {
      out[o.name] = {
        color: `#${o.material.color.getHexString()}`,
        emissive: o.material.emissive ? `#${o.material.emissive.getHexString()}` : null,
        emissiveIntensity: o.material.emissiveIntensity ?? null,
        opacity: o.material.opacity ?? null,
      }
    }
  })
  return out
}, names)

const visibleMeshNames = (page) => page.evaluate(() => {
  const names = []
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  root.traverse((o) => {
    if (o.isMesh && o.name && o.visible && o.material?.color) names.push(o.name)
  })
  return [...new Set(names)].sort()
})

const legendColors = (page, groupLabels) => page.evaluate((labels) => {
  const out = {}
  const toHex = (color) => {
    const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
    if (!match) return color
    return `#${match.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`
  }
  for (const swatch of document.querySelectorAll('[data-color-group]')) {
    const label = swatch.getAttribute('data-color-group')?.trim()
    if (label) out[label] = toHex(getComputedStyle(swatch).backgroundColor)
  }
  return out
}, groupLabels)

async function expandLegend(page) {
  const button = page.getByRole('button', { name: 'Legende erweitern' })
  if (await button.count()) {
    await button.first().click()
    await page.waitForTimeout(100)
  }
}

const figures = figureConfigs()
if (figures.length === 0) throw new Error('smoke-figures: keine color-preset Figure-Configs gefunden')

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => {
  pageErrors.push(e.message)
  console.log('  [pageerror]', e.message)
})

let fails = 0
const check = (cond, msg) => {
  if (!cond) {
    console.log('  FAIL:', msg)
    fails++
  } else {
    console.log('  ok:', msg)
  }
}

for (const figure of figures) {
  const expectations = expectationsFor(figure)
  const groups = [...new Set(expectations.map((row) => row.groupLabel))]
  await page.goto(figureUrl(figure), { waitUntil: 'networkidle' })
  await waitBrain(page)
  await expandLegend(page)
  let legendByGroup = {}
  for (let i = 0; i < 20; i++) {
    legendByGroup = await legendColors(page, groups)
    if (groups.every((group) => legendByGroup[group] === expectations.find((row) => row.groupLabel === group)?.expectedColor)) break
    await page.waitForTimeout(150)
  }

  console.log(`\nFigure ${figure.cfg.replaces_figure ?? figure.cfg.label_de} / ${figure.name} / ${figure.preset.id}`)
  check(Object.keys(legendByGroup).length === groups.length, `Legende nennt ${groups.join(', ')}`)
  const extraLegendGroups = Object.keys(legendByGroup).filter((group) => !groups.includes(group))
  check(
    extraLegendGroups.length === 0,
    `Legende enthaelt keine irrelevanten Gruppen${extraLegendGroups.length ? `; extra: ${extraLegendGroups.join(', ')}` : ''}`,
  )

  const expectedMeshes = new Set(expectations.flatMap((row) => row.meshes))
  const visibleNames = await visibleMeshNames(page)
  const extraVisible = visibleNames.filter((name) => !expectedMeshes.has(name))
  check(
    extraVisible.length === 0,
    `3D-Modell zeigt nur relevante Preset-Meshes${extraVisible.length ? `; extra: ${extraVisible.slice(0, 12).join(',')}` : ''}`,
  )

  for (const row of expectations) {
    let states = {}
    for (let i = 0; i < 20; i++) {
      states = await meshStates(page, row.meshes)
      if (row.meshes.every((mesh) => (
        states[mesh]?.color === row.expectedColor &&
        states[mesh]?.emissive === row.expectedColor &&
        states[mesh]?.emissiveIntensity === PRESET_COLOR_EMISSIVE_INTENSITY &&
        states[mesh]?.opacity === 1
      ))) break
      await page.waitForTimeout(150)
    }
    const wrong = row.meshes.filter((mesh) => states[mesh]?.color !== row.expectedColor)
    const overpainted = row.meshes.filter((mesh) => states[mesh]?.emissive !== row.expectedColor)
    const dimmed = row.meshes.filter((mesh) => states[mesh]?.opacity !== 1)
    check(
      legendByGroup[row.groupLabel] === row.expectedColor,
      `${row.bucket} Legende "${row.groupLabel}" nutzt erwartete Preset-Farbe ${row.expectedColor}`,
    )
    check(
      wrong.length === 0,
      `${row.bucket} faerbt alle ${row.meshes.length} Config-Meshes in Preset-Farbe "${row.groupLabel}" ${row.expectedColor}${wrong.length ? `; falsch: ${wrong.slice(0, 5).join(',')}` : ''}`,
    )
    check(
      overpainted.length === 0,
      `${row.bucket} nutzt keine Highlight-Emissive-Übermalung statt Preset-Farbe${overpainted.length ? `; falsch: ${overpainted.slice(0, 5).join(',')}` : ''}`,
    )
    check(
      dimmed.length === 0,
      `${row.bucket} dimmt keine Preset-Meshes durch alte Szenen-Highlights${dimmed.length ? `; gedimmt: ${dimmed.slice(0, 5).join(',')}` : ''}`,
    )
  }
}

check(pageErrors.length === 0, `keine Browser-pageerror (${pageErrors.length ? pageErrors.join(' | ') : '0'})`)
mkdirSync(resolve(here, 'work'), { recursive: true })
await page.screenshot({ path: resolve(here, 'work/smoke-figures.png') })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
