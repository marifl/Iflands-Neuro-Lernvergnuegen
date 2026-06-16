// 3-Schichten-Config-Resolver. Scope-Keys: axis:<id> | atlas:<id> | group:<atlas>:<lobe> | area:<id>.
// Quelle config.json (erzeugt von scripts/atlas/build-config.mjs). KEINE stillen Defaults — fehlende
// Presets/Configurations/Areale werfen laut.
import { useEffect, useState } from 'react'
import { loadCatalog, type AtlasCatalog } from './atlasCatalog'
import { ROUTE_CHANGE_EVENT } from '../../scene/router'
import { getLocalStorageItem } from '../../safeLocalStorage'

export type ScopeMap = Record<string, boolean>

export interface PresetNode { label_de: string; scopes: ScopeMap; visibility?: ConfigVisibility }
export interface ConfigFacets { clinic?: boolean; function?: boolean; chapter?: boolean; provenance?: boolean }
export interface ConfigView { surface?: 'pial' | 'inflated'; subcortex?: boolean; carve_on_taro?: 'off' | 'dkt' | 'julich' }
export interface ConfigCamera {
  target?: string
  shot?: string
  fit?: 'bounds' | 'target'
  bounds?: { center: [number, number, number]; radius: number }
  margin?: number
  fov?: number
  pose?: { position: [number, number, number]; look_at: [number, number, number] }
}
export interface ConfigRegions {
  areas?: string[]
  buckets?: string[]
  meshes?: string[]
  scene_regions?: string[]
}
export interface ConfigColors {
  enabled?: boolean
  preset?: string
  groups?: { label: string; hue: number; buckets: string[] }[]
  dim_others?: boolean
}
export interface ConfigVisibility { dim_others?: boolean; dim_opacity?: number; hidden?: string[]; isolated?: string[] }
export interface ConfigCuts { enabled?: boolean; planes?: { axis: 'x' | 'y' | 'z'; position: number; keep?: 'positive' | 'negative' }[] }
export interface ConfigOverlay {
  kind?: 'erp' | 'topography' | 'flowchart' | 'table' | 'image' | 'prose'
  scene?: string
  position?: 'left' | 'right' | 'center' | 'bottom'
  size?: 'sm' | 'md' | 'lg'
  fallback_image?: string
}
export interface ConfigSequencing { presentation?: string; learning?: string; step?: string }
export interface MeshMappingNode { meshes: string[]; known_gap?: boolean; gap_reason?: string }
export interface MeshMappings {
  buckets: Record<string, MeshMappingNode>
  scene_regions: Record<string, MeshMappingNode>
}
export interface ConfigurationNode {
  label_de: string
  title?: string
  section?: string
  replaces_figure?: string
  facets?: ConfigFacets
  view?: ConfigView
  camera?: ConfigCamera
  regions?: ConfigRegions
  colors?: ConfigColors
  visibility?: ConfigVisibility
  cuts?: ConfigCuts
  overlay?: ConfigOverlay
  sequencing?: ConfigSequencing
  scopes: ScopeMap
}
export interface SequenceNode { label_de: string; steps: string[] }
export interface AtlasConfigFile {
  preset: string
  presets: Record<string, PresetNode>
  mesh_mappings: MeshMappings
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
  const raw = getLocalStorageItem(LS_KEY)
  if (!raw) return { preset: null, configuration: null, scopes: {} }
  return JSON.parse(raw) as LocalOverrides
}

export interface EffectiveConfig {
  catalog: AtlasCatalog
  preset: string
  hasUrlPreset: boolean
  hasUrlConfig: boolean
  activeConfiguration: string | null
  configuration: ConfigurationNode | null
  facets: ConfigFacets
  view: ConfigView
  camera: ConfigCamera
  cameraTargetMeshes: string[]
  visibility: ConfigVisibility
  scopes: ScopeMap
  isAreaEnabled: (areaId: string) => boolean
}

function findCatalogArea(catalog: AtlasCatalog, areaId: string) {
  for (const atlas of catalog.atlases) {
    for (const group of atlas.groups) {
      for (const area of group.areas) {
        if (area.id === areaId) return area
      }
    }
  }
  return null
}

export function targetMeshesForCamera(catalog: AtlasCatalog, configName: string, camera: ConfigCamera): string[] {
  if (camera.fit !== 'target') return []
  if (!camera.target) throw new Error(`computeEffectiveConfig: Configuration "${configName}" camera.fit="target" braucht camera.target`)
  const area = findCatalogArea(catalog, camera.target)
  if (!area) throw new Error(`computeEffectiveConfig: camera.target "${camera.target}" im Katalog unbekannt`)
  if (area.hosts.length === 0) throw new Error(`computeEffectiveConfig: camera.target "${camera.target}" hat keine TARO-Hosts`)
  const side = area.side === 'L' ? 'left' : 'right'
  return area.hosts.map((host) => `${side}-${host}`)
}

function mergeVisibility(base: ConfigVisibility | undefined, override: ConfigVisibility | undefined): ConfigVisibility {
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  }
}

/** Mergt die 3 Schichten zu einer effective config. Praezedenz: file < localStorage < url.
 *  Ein URL-`config` ist ein kanonischer Link: persistierte lokale Overrides duerfen ihn nicht verfaelschen. */
export function computeEffectiveConfig(
  file: AtlasConfigFile,
  catalog: AtlasCatalog,
  local: LocalOverrides,
  url: URLSearchParams,
): EffectiveConfig {
  const lookup = buildAreaLookup(catalog)
  const urlPreset = url.get('preset')
  const urlConfig = url.get('config')
  const hasUrlPreset = urlPreset !== null
  const hasUrlConfig = urlConfig !== null
  const preset = urlPreset ?? (hasUrlConfig ? file.preset : local.preset ?? file.preset)
  if (!file.presets[preset]) throw new Error(`computeEffectiveConfig: Preset "${preset}" nicht definiert`)
  const activeConfiguration = urlConfig ?? local.configuration ?? null
  if (activeConfiguration && !file.configurations[activeConfiguration]) {
    throw new Error(`computeEffectiveConfig: Configuration "${activeConfiguration}" nicht definiert`)
  }
  const cfg = activeConfiguration ? file.configurations[activeConfiguration] : null
  const scopes = resolveScopes(
    fileScopes(file, preset, activeConfiguration),
    hasUrlConfig ? {} : local.scopes,
    parseUrlScopes(url),
  )
  return {
    catalog,
    preset,
    hasUrlPreset,
    hasUrlConfig,
    activeConfiguration,
    configuration: cfg,
    // Eine Configuration ohne facets/view/camera bedeutet fachlich "nichts gesetzt" (kein Bug).
    facets: cfg?.facets ?? {},
    view: cfg?.view ?? {},
    camera: cfg?.camera ?? {},
    cameraTargetMeshes: cfg ? targetMeshesForCamera(catalog, activeConfiguration!, cfg.camera ?? {}) : [],
    visibility: mergeVisibility(file.presets[preset]?.visibility, cfg?.visibility),
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
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let alive = true
    let cleanup = () => {}
    const fail = (err: unknown) => {
      if (!alive) return
      setError(err instanceof Error ? err : new Error(String(err)))
    }
    Promise.all([loadConfigFile(), loadCatalog()]).then(([file, catalog]) => {
      if (!alive) return
      const refresh = () => {
        if (!alive) return
        const url = new URLSearchParams(window.location.search)
        try {
          setEff(computeEffectiveConfig(file, catalog, loadLocalOverrides(), url))
        } catch (err) {
          fail(err)
        }
      }
      refresh()
      window.addEventListener('popstate', refresh)
      window.addEventListener(ROUTE_CHANGE_EVENT, refresh)
      cleanup = () => {
        window.removeEventListener('popstate', refresh)
        window.removeEventListener(ROUTE_CHANGE_EVENT, refresh)
      }
    }).catch(fail)
    return () => { alive = false; cleanup() }
  }, [])
  if (error) throw error
  return eff
}
