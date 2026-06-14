// 3-Schichten-Config-Resolver. Scope-Keys: axis:<id> | atlas:<id> | group:<atlas>:<lobe> | area:<id>.
// Quelle config.json (erzeugt von scripts/atlas/build-config.mjs). KEINE stillen Defaults — fehlende
// Presets/Configurations/Areale werfen laut.
import { useEffect, useState } from 'react'
import { loadCatalog, type AtlasCatalog } from './atlasCatalog'

export type ScopeMap = Record<string, boolean>

export interface PresetNode { label_de: string; scopes: ScopeMap }
export interface ConfigFacets { clinic?: boolean; function?: boolean; chapter?: boolean; provenance?: boolean }
export interface ConfigView { surface?: 'pial' | 'inflated'; subcortex?: boolean; carve_on_taro?: 'off' | 'dkt' | 'julich' }
export interface ConfigCamera { target?: string }
export interface ConfigurationNode {
  label_de: string
  replaces_figure?: string
  facets?: ConfigFacets
  view?: ConfigView
  camera?: ConfigCamera
  scopes: ScopeMap
}
export interface SequenceNode { label_de: string; steps: string[] }
export interface AtlasConfigFile {
  preset: string
  presets: Record<string, PresetNode>
  configurations: Record<string, ConfigurationNode>
  presentation: Record<string, SequenceNode>
  learning: Record<string, SequenceNode>
}

/** Areal-ID -> Vererbungs-Koordinaten (aus dem Katalog gebaut). */
export type AreaLookup = Record<string, { atlas: string; lobe: string; axis: string }>

/** Merge der 3 Schichten pro Scope-Key: file < localStorage < url. */
export function resolveScopes(file: ScopeMap, local: ScopeMap, url: ScopeMap): ScopeMap {
  return { ...file, ...local, ...url }
}

/** Vererbung: Areal -> Gruppe -> Atlas -> Achse; erster expliziter Treffer. Default false. */
export function isAreaEnabled(areaId: string, scopes: ScopeMap, lookup: AreaLookup): boolean {
  const co = lookup[areaId]
  if (!co) throw new Error(`isAreaEnabled: Areal "${areaId}" im Katalog unbekannt`)
  const chain = [
    `area:${areaId}`,
    `group:${co.atlas}:${co.lobe}`,
    `atlas:${co.atlas}`,
    `axis:${co.axis}`,
  ]
  for (const key of chain) {
    if (key in scopes) return scopes[key]
  }
  return false
}

/** Areal-Lookup aus dem Katalog (fuer Vererbung). */
export function buildAreaLookup(catalog: AtlasCatalog): AreaLookup {
  const lk: AreaLookup = {}
  for (const a of catalog.atlases) {
    for (const g of a.groups) {
      for (const area of g.areas) lk[area.id] = { atlas: a.id, lobe: g.id, axis: a.axis }
    }
  }
  return lk
}

/** Datei-Schicht: aktives Preset + aktive Configuration, pro Scope-Key gemergt. */
export function fileScopes(file: AtlasConfigFile, presetName: string, configName: string | null): ScopeMap {
  const preset = file.presets[presetName]
  if (!preset) throw new Error(`fileScopes: Preset "${presetName}" nicht definiert`)
  let scopes: ScopeMap = { ...preset.scopes }
  if (configName) {
    const cfg = file.configurations[configName]
    if (!cfg) throw new Error(`fileScopes: Configuration "${configName}" nicht definiert`)
    scopes = { ...scopes, ...cfg.scopes }
  }
  return scopes
}

/** URL-Schicht: ?on=id,id & ?off=id,id (kommagetrennt) -> Areal-Scopes. */
export function parseUrlScopes(params: URLSearchParams): ScopeMap {
  const scopes: ScopeMap = {}
  for (const id of (params.get('on') ?? '').split(',').filter(Boolean)) scopes[`area:${id}`] = true
  for (const id of (params.get('off') ?? '').split(',').filter(Boolean)) scopes[`area:${id}`] = false
  return scopes
}

/** localStorage-Schicht (Schicht 2): persistierte User-Overrides. */
export interface LocalOverrides { preset: string | null; configuration: string | null; scopes: ScopeMap }
const LS_KEY = 'atlas-config-overrides'
export function loadLocalOverrides(): LocalOverrides {
  if (typeof localStorage === 'undefined') return { preset: null, configuration: null, scopes: {} }
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return { preset: null, configuration: null, scopes: {} }
  return JSON.parse(raw) as LocalOverrides
}

export interface EffectiveConfig {
  preset: string
  activeConfiguration: string | null
  facets: ConfigFacets
  view: ConfigView
  camera: ConfigCamera
  scopes: ScopeMap
  isAreaEnabled: (areaId: string) => boolean
}

/** Mergt die 3 Schichten zu einer effective config. Praezedenz: file < localStorage < url. */
export function computeEffectiveConfig(
  file: AtlasConfigFile,
  catalog: AtlasCatalog,
  local: LocalOverrides,
  url: URLSearchParams,
): EffectiveConfig {
  const lookup = buildAreaLookup(catalog)
  const urlPreset = url.get('preset')
  const urlConfig = url.get('config')
  const preset = urlPreset ?? local.preset ?? file.preset
  if (!file.presets[preset]) throw new Error(`computeEffectiveConfig: Preset "${preset}" nicht definiert`)
  const activeConfiguration = urlConfig ?? local.configuration ?? null
  if (activeConfiguration && !file.configurations[activeConfiguration]) {
    throw new Error(`computeEffectiveConfig: Configuration "${activeConfiguration}" nicht definiert`)
  }
  const scopes = resolveScopes(
    fileScopes(file, preset, activeConfiguration),
    local.scopes,
    parseUrlScopes(url),
  )
  const cfg = activeConfiguration ? file.configurations[activeConfiguration] : null
  return {
    preset,
    activeConfiguration,
    // Eine Configuration ohne facets/view/camera bedeutet fachlich "nichts gesetzt" (kein Bug).
    facets: cfg?.facets ?? {},
    view: cfg?.view ?? {},
    camera: cfg?.camera ?? {},
    scopes,
    isAreaEnabled: (areaId: string) => isAreaEnabled(areaId, scopes, lookup),
  }
}

const CONFIG_URL = '/assets/atlas-canonical/atlas-config.json'

async function loadConfigFile(): Promise<AtlasConfigFile> {
  const r = await fetch(CONFIG_URL)
  if (!r.ok) throw new Error(`loadConfigFile: ${CONFIG_URL} nicht ladbar (HTTP ${r.status})`)
  return (await r.json()) as AtlasConfigFile
}

/** React-Hook: laedt config.json + Katalog, liefert effective config (oder null waehrend Laden). */
export function useEffectiveConfig(): EffectiveConfig | null {
  const [eff, setEff] = useState<EffectiveConfig | null>(null)
  useEffect(() => {
    let alive = true
    Promise.all([loadConfigFile(), loadCatalog()]).then(([file, catalog]) => {
      if (!alive) return
      const url = new URLSearchParams(window.location.search)
      setEff(computeEffectiveConfig(file, catalog, loadLocalOverrides(), url))
    })
    return () => { alive = false }
  }, [])
  return eff
}
