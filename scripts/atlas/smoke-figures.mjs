// Config-getriebener Smoke: prueft Figure-Faerbungen aus atlas-config.json.
// Erwartete Figuren, Presets, Buckets und Meshes kommen aus Runtime-/Preset-Config,
// nicht aus einer zweiten Mapping-Liste im Test.
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
const config = JSON.parse(readFileSync(resolve(appPublic, 'assets/atlas-canonical/atlas-config.json'), 'utf8'))
const colorPresetFile = JSON.parse(readFileSync(resolve(appPublic, 'companion/config/color-presets.json'), 'utf8'))
const colorPresets = new Map(colorPresetFile.presets.map((preset) => [preset.id, preset]))

function hueToHex(hue, sat = 0.46, light = 0.52) {
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
    .filter(([, cfg]) => cfg.replaces_figure && cfg.colors?.enabled !== false)
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
  for (const bucket of figure.cfg.regions.buckets) {
    const group = figure.preset.groups.find((candidate) => candidate.buckets.includes(bucket))
    if (!group) {
      throw new Error(`smoke-figures: Config "${figure.name}" Bucket "${bucket}" fehlt in Preset "${figure.preset.id}"`)
    }
    rows.push({ bucket, groupLabel: group.label, expectedColor: hueToHex(group.hue), meshes: bucketMeshes(bucket) })
  }
  return rows
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

const meshColors = (page, names) => page.evaluate((want) => {
  const out = {}
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  root.traverse((o) => {
    if (o.isMesh && want.includes(o.name) && o.visible) out[o.name] = `#${o.material.color.getHexString()}`
  })
  return out
}, names)

const legendColors = (page, groupLabels) => page.evaluate((labels) => {
  const panel = [...document.querySelectorAll('.ed-panel')]
    .find((candidate) => candidate.textContent?.includes('Färbung'))
  if (!panel) return {}
  const spans = [...panel.querySelectorAll('span')]
  const out = {}
  const toHex = (color) => {
    const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
    if (!match) return color
    return `#${match.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`
  }
  for (let i = 1; i < spans.length; i++) {
    const label = spans[i].textContent?.trim()
    if (labels.includes(label)) out[label] = toHex(getComputedStyle(spans[i - 1]).backgroundColor)
  }
  return out
}, groupLabels)

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
  await page.goto(`${BASE}/?config=${figure.name}`, { waitUntil: 'networkidle' })
  await waitBrain(page)
  const legendByGroup = await legendColors(page, groups)

  console.log(`\nFigure ${figure.cfg.replaces_figure} / ${figure.name} / ${figure.preset.id}`)
  check(Object.keys(legendByGroup).length === groups.length, `Legende nennt ${groups.join(', ')}`)

  for (const row of expectations) {
    let colors = {}
    for (let i = 0; i < 20; i++) {
      colors = await meshColors(page, row.meshes)
      if (row.meshes.every((mesh) => colors[mesh] === row.expectedColor)) break
      await page.waitForTimeout(150)
    }
    const wrong = row.meshes.filter((mesh) => colors[mesh] !== row.expectedColor)
    check(
      legendByGroup[row.groupLabel] === row.expectedColor,
      `${row.bucket} Legende "${row.groupLabel}" nutzt erwartete Preset-Farbe ${row.expectedColor}`,
    )
    check(
      wrong.length === 0,
      `${row.bucket} faerbt alle ${row.meshes.length} Config-Meshes in Preset-Farbe "${row.groupLabel}" ${row.expectedColor}${wrong.length ? `; falsch: ${wrong.slice(0, 5).join(',')}` : ''}`,
    )
  }
}

check(pageErrors.length === 0, `keine Browser-pageerror (${pageErrors.length ? pageErrors.join(' | ') : '0'})`)
mkdirSync(resolve(here, 'work'), { recursive: true })
await page.screenshot({ path: resolve(here, 'work/smoke-figures.png') })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
