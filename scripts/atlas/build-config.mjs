// scripts/atlas/build-config.mjs
// TOML-Config (config.default.toml) -> validiertes config.json. Validiert JEDE Referenz
// (Areal/Gruppe/Atlas/Achse/Config/Step) gegen atlas-ontology.json. Tote Referenz = lauter throw.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ASSETS = join(HERE, '../../apps/brain-app/public/assets/atlas-canonical')

/** Sammelt valide Scope-IDs aus dem Katalog (axes/atlases/groups/areas). */
export function indexCatalog(catalog) {
  const idx = { axes: new Set(), atlases: new Set(), groups: new Set(), areas: new Set() }
  for (const ax of catalog.axes) idx.axes.add(ax.id)
  for (const a of catalog.atlases) {
    idx.atlases.add(a.id)
    for (const g of a.groups) {
      idx.groups.add(`group:${a.id}:${g.id}`)
      for (const area of g.areas) idx.areas.add(area.id)
    }
  }
  return idx
}

/** Wirft laut bei unbekannter Scope-Art oder toter Referenz. */
export function validateScopeKey(key, idx) {
  if (key.startsWith('axis:')) {
    const id = key.slice('axis:'.length)
    if (!idx.axes.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Achse unbekannt)`)
  } else if (key.startsWith('atlas:')) {
    const id = key.slice('atlas:'.length)
    if (!idx.atlases.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Atlas unbekannt)`)
  } else if (key.startsWith('group:')) {
    if (!idx.groups.has(key)) throw new Error(`build-config: tote Scope-Ref "${key}" (Gruppe unbekannt)`)
  } else if (key.startsWith('area:')) {
    const id = key.slice('area:'.length)
    if (!idx.areas.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Areal unbekannt)`)
  } else {
    throw new Error(`build-config: unbekannte Scope-Art in "${key}"`)
  }
}

const FACET_KEYS = new Set(['clinic', 'function', 'chapter', 'provenance'])
const SURFACES = new Set(['pial', 'inflated'])
const CARVE = new Set(['off', 'dkt', 'julich'])

/** Validiert die ganze Config gegen den Katalog. Jede tote Referenz wirft. */
export function validateConfig(config, idx) {
  if (!config.preset) throw new Error('build-config: kein aktives "preset" gesetzt')
  if (!config.presets?.[config.preset]) {
    throw new Error(`build-config: aktives Preset "${config.preset}" nicht in [presets] definiert`)
  }
  for (const p of Object.values(config.presets)) {
    for (const key of Object.keys(p.scopes ?? {})) validateScopeKey(key, idx)
  }
  for (const [name, c] of Object.entries(config.configurations ?? {})) {
    for (const key of Object.keys(c.scopes ?? {})) validateScopeKey(key, idx)
    for (const fk of Object.keys(c.facets ?? {})) {
      if (!FACET_KEYS.has(fk)) throw new Error(`build-config: configuration "${name}" hat unbekannte Facette "${fk}"`)
    }
    if (c.view?.surface && !SURFACES.has(c.view.surface)) {
      throw new Error(`build-config: configuration "${name}" view.surface "${c.view.surface}" ungueltig`)
    }
    if (c.view?.carve_on_taro && !CARVE.has(c.view.carve_on_taro)) {
      throw new Error(`build-config: configuration "${name}" view.carve_on_taro "${c.view.carve_on_taro}" ungueltig`)
    }
    if (c.camera?.target && !idx.areas.has(c.camera.target)) {
      throw new Error(`build-config: configuration "${name}" camera.target "${c.camera.target}" — Areal unbekannt`)
    }
  }
  for (const seqKind of ['presentation', 'learning']) {
    for (const [seqName, seq] of Object.entries(config[seqKind] ?? {})) {
      for (const step of seq.steps ?? []) {
        if (!config.configurations?.[step]) {
          throw new Error(`build-config: ${seqKind} "${seqName}" referenziert unbekannten Step "${step}"`)
        }
      }
    }
  }
}

/** smol-toml aus apps/brain-app/node_modules aufloesen (nicht von repo-root sichtbar). */
async function loadToml(path) {
  const appReq = createRequire(pathToFileURL(join(HERE, '../../apps/brain-app/package.json')))
  const { parse } = await import(pathToFileURL(appReq.resolve('smol-toml')))
  return parse(readFileSync(path, 'utf8'))
}

/** Parst config.default.toml, validiert gegen Katalog, gibt {config} zurueck. */
export async function buildConfig() {
  const catalog = JSON.parse(readFileSync(join(APP_ASSETS, 'atlas-ontology.json'), 'utf8'))
  const config = await loadToml(join(HERE, 'config.default.toml'))
  const idx = indexCatalog(catalog)
  validateConfig(config, idx)
  return { config }
}

async function main() {
  const { config } = await buildConfig()
  const out = join(APP_ASSETS, 'atlas-config.json')
  writeFileSync(out, JSON.stringify(config, null, 2))
  const nCfg = Object.keys(config.configurations ?? {}).length
  const nPreset = Object.keys(config.presets ?? {}).length
  console.log(`build-config: ${nPreset} Presets, ${nCfg} Configurations -> ${out}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
