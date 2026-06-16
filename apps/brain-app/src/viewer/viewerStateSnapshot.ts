import { CUT_AXES, clampCutPosition, type CutConfig, type CutMode } from './cutCapsMerged'
import type { ColorPreset } from './colorPresets'
import type { ColorMode, Lang } from './ontology'
import { APP_MODES, useViewerStore, type AppMode, type CameraPose, type SelectMode, type ViewMode } from './viewerStore'
import { sceneIndexForLocation } from '../scene/scenes'
import { useSceneStore } from '../scene/sceneStore'
import { parseLocation, replaceCanonicalLocation, type SceneLocation } from '../scene/router'

export const VIEWER_STATE_SNAPSHOT_VERSION = 1

let importedSnapshotRouteSearch: string | null = null

const COLOR_MODES = ['anatomical', 'function', 'laterality', 'region', 'preset'] as const satisfies readonly ColorMode[]
const CUT_MODES = ['slice', 'hide'] as const satisfies readonly CutMode[]
const LANGS = ['de', 'la', 'en'] as const satisfies readonly Lang[]
const SELECT_MODES = ['group', 'direct'] as const satisfies readonly SelectMode[]
const VIEW_MODES = ['full', 'k11'] as const satisfies readonly ViewMode[]

export interface ViewerStateSnapshotState {
  activePreset?: ColorPreset | null
  appMode: AppMode
  cameraPose: CameraPose | null; cameraView: string | null
  clipAtlasOverlay: boolean
  colorMode: ColorMode
  cutMode: CutMode
  cuts: Record<(typeof CUT_AXES)[number], CutConfig>
  hidden: string[]
  highlight: string[]
  isolated: string | null
  lang: Lang
  mode: ViewMode
  pickedAtlasArea: string | null; pickedAtlasSlug: string | null
  rodPhase: number; rodVisible: boolean
  route: SceneLocation | null
  selectMode: SelectMode
  selected: string | null
  showAtlasDkt: boolean; showAtlasJulich: boolean
  showCarveBrodmann: boolean; showCarveDkt: boolean; showCarveJulich: boolean
  showSkull: boolean; skullOpacity: number
}

export interface ViewerStateSnapshot { version: typeof VIEWER_STATE_SNAPSHOT_VERSION; state: ViewerStateSnapshotState }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new Error(`Viewer-State-Snapshot: ${field} muss string oder null sein`)
  return value
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Viewer-State-Snapshot: ${field} muss ein String-Array sein`)
  }
  return [...value]
}

function booleanValue(value: unknown, fallback: boolean, field: string): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new Error(`Viewer-State-Snapshot: ${field} muss boolean sein`)
  return value
}

function numberValue(value: unknown, fallback: number, field: string): number {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Viewer-State-Snapshot: ${field} muss eine finite Zahl sein`)
  }
  return value
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): T {
  if (value === undefined) return fallback
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`Viewer-State-Snapshot: ${field} hat einen ungueltigen Wert`)
}

function unitValue(value: unknown, fallback: number, field: string): number {
  return Math.min(1, Math.max(0, numberValue(value, fallback, field)))
}

function routeStepValue(value: unknown, field: string): number {
  const step = numberValue(value, 0, field)
  if (!Number.isSafeInteger(step) || step < 0) {
    throw new Error(`Viewer-State-Snapshot: ${field} muss ein nicht-negativer Integer sein`)
  }
  return step
}

function vec3Value(value: unknown, field: string): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`Viewer-State-Snapshot: ${field} muss ein [x,y,z]-Array sein`)
  }
  return [
    numberValue(value[0], 0, `${field}[0]`),
    numberValue(value[1], 0, `${field}[1]`),
    numberValue(value[2], 0, `${field}[2]`),
  ]
}

function cameraFovValue(value: unknown): number {
  const fov = numberValue(value, 40, 'cameraPose.fov')
  if (fov <= 0 || fov >= 180) {
    throw new Error(`Viewer-State-Snapshot: cameraPose.fov muss zwischen 0 und 180 Grad liegen, erhalten ${fov}`)
  }
  return fov
}

function parseCameraPose(value: unknown): CameraPose | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) throw new Error('Viewer-State-Snapshot: cameraPose muss ein Objekt sein')
  return {
    position: vec3Value(value.position, 'cameraPose.position'),
    target: vec3Value(value.target, 'cameraPose.target'),
    fov: cameraFovValue(value.fov),
  }
}

function parseCutConfig(value: unknown, fallback: CutConfig, field: string): CutConfig {
  if (value === undefined) return fallback
  if (!isRecord(value)) throw new Error(`Viewer-State-Snapshot: ${field} muss ein Objekt sein`)
  return {
    on: booleanValue(value.on, fallback.on, `${field}.on`),
    pos: clampCutPosition(numberValue(value.pos, fallback.pos, `${field}.pos`)),
  }
}

function parseCuts(value: unknown, fallback: ViewerStateSnapshotState['cuts']): ViewerStateSnapshotState['cuts'] {
  if (value === undefined) return fallback
  if (!isRecord(value)) throw new Error('Viewer-State-Snapshot: cuts muss ein Objekt sein')
  return {
    sagittal: parseCutConfig(value.sagittal, fallback.sagittal, 'cuts.sagittal'),
    coronal: parseCutConfig(value.coronal, fallback.coronal, 'cuts.coronal'),
    axial: parseCutConfig(value.axial, fallback.axial, 'cuts.axial'),
  }
}

function parseColorPreset(value: unknown): ColorPreset | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.label !== 'string' || !Array.isArray(value.groups)) {
    throw new Error('Viewer-State-Snapshot: activePreset ist ungueltig')
  }
  const groups = value.groups.map((group, i) => {
    if (!isRecord(group) || typeof group.label !== 'string' || typeof group.hue !== 'number' || !Array.isArray(group.buckets)) {
      throw new Error(`Viewer-State-Snapshot: activePreset.groups[${i}] ist ungueltig`)
    }
    if (group.buckets.some((bucket) => typeof bucket !== 'string')) {
      throw new Error(`Viewer-State-Snapshot: activePreset.groups[${i}].buckets muss ein String-Array sein`)
    }
    return { label: group.label, hue: group.hue, buckets: [...group.buckets] }
  })
  return {
    id: value.id,
    label: value.label,
    groups,
    dimOthers: value.dimOthers === undefined ? true : booleanValue(value.dimOthers, true, 'activePreset.dimOthers'),
  }
}

function currentRoute(): SceneLocation | null {
  const route = parseLocation(window.location.search)
  if (!route.configName && !route.sceneId) return null
  return route
}

function parseRoute(value: unknown): SceneLocation | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) throw new Error('Viewer-State-Snapshot: route muss ein Objekt sein')
  const configName = optionalString(value.configName, 'route.configName')
  const sceneId = optionalString(value.sceneId, 'route.sceneId')
  if (!configName && !sceneId) {
    throw new Error('Viewer-State-Snapshot: route braucht configName oder sceneId')
  }
  return {
    configName,
    sceneId,
    step: routeStepValue(value.step, 'route.step'),
  }
}

function applyRoute(route: SceneLocation | null): void {
  if (!route) return
  replaceCanonicalLocation(route)
  importedSnapshotRouteSearch = window.location.search
  const sceneStore = useSceneStore.getState()
  if (!sceneStore.scenes.length) return
  const index = sceneIndexForLocation(sceneStore.scenes, route)
  sceneStore.goto(index >= 0 ? index : 0, route.step)
}

export function hasImportedSnapshotRouteForCurrentLocation(): boolean {
  if (importedSnapshotRouteSearch === null) return false
  if (importedSnapshotRouteSearch !== window.location.search) {
    importedSnapshotRouteSearch = null
    return false
  }
  return true
}

function currentSnapshotState(): ViewerStateSnapshotState {
  const state = useViewerStore.getState()
  return {
    activePreset: state.activePreset,
    appMode: state.appMode,
    cameraPose: state.cameraPose,
    cameraView: state.cameraView?.name ?? null,
    clipAtlasOverlay: state.clipAtlasOverlay,
    colorMode: state.colorMode,
    cutMode: state.cutMode,
    cuts: {
      sagittal: { ...state.cuts.sagittal },
      coronal: { ...state.cuts.coronal },
      axial: { ...state.cuts.axial },
    },
    hidden: [...state.hidden].sort(),
    highlight: [...state.highlight],
    isolated: state.isolated,
    lang: state.lang,
    mode: state.mode,
    pickedAtlasArea: state.pickedAtlasArea,
    pickedAtlasSlug: state.pickedAtlasSlug,
    rodPhase: state.rodPhase,
    rodVisible: state.rodVisible,
    route: currentRoute(),
    selectMode: state.selectMode,
    selected: state.selected,
    showAtlasDkt: state.showAtlasDkt,
    showAtlasJulich: state.showAtlasJulich,
    showCarveBrodmann: state.showCarveBrodmann,
    showCarveDkt: state.showCarveDkt,
    showCarveJulich: state.showCarveJulich,
    showSkull: state.showSkull,
    skullOpacity: state.skullOpacity,
  }
}

function parseSnapshotState(raw: unknown, fallback = currentSnapshotState()): ViewerStateSnapshotState {
  if (!isRecord(raw)) throw new Error('Viewer-State-Snapshot: state muss ein Objekt sein')
  const activePreset = parseColorPreset(raw.activePreset)
  const colorMode = enumValue(raw.colorMode, COLOR_MODES, fallback.colorMode, 'colorMode')
  return {
    activePreset,
    appMode: enumValue(raw.appMode, APP_MODES, fallback.appMode, 'appMode'),
    cameraPose: parseCameraPose(raw.cameraPose),
    cameraView: optionalString(raw.cameraView, 'cameraView'),
    clipAtlasOverlay: booleanValue(raw.clipAtlasOverlay, fallback.clipAtlasOverlay, 'clipAtlasOverlay'),
    colorMode: colorMode === 'preset' && !activePreset ? 'region' : colorMode,
    cutMode: enumValue(raw.cutMode, CUT_MODES, fallback.cutMode, 'cutMode'),
    cuts: parseCuts(raw.cuts, fallback.cuts),
    hidden: stringArray(raw.hidden, 'hidden').sort(),
    highlight: stringArray(raw.highlight, 'highlight'),
    isolated: optionalString(raw.isolated, 'isolated'),
    lang: enumValue(raw.lang, LANGS, fallback.lang, 'lang'),
    mode: enumValue(raw.mode, VIEW_MODES, fallback.mode, 'mode'),
    pickedAtlasArea: optionalString(raw.pickedAtlasArea, 'pickedAtlasArea'),
    pickedAtlasSlug: optionalString(raw.pickedAtlasSlug, 'pickedAtlasSlug'),
    rodPhase: unitValue(raw.rodPhase, fallback.rodPhase, 'rodPhase'),
    rodVisible: booleanValue(raw.rodVisible, fallback.rodVisible, 'rodVisible'),
    route: parseRoute(raw.route),
    selectMode: enumValue(raw.selectMode, SELECT_MODES, fallback.selectMode, 'selectMode'),
    selected: optionalString(raw.selected, 'selected'),
    showAtlasDkt: booleanValue(raw.showAtlasDkt, fallback.showAtlasDkt, 'showAtlasDkt'),
    showAtlasJulich: booleanValue(raw.showAtlasJulich, fallback.showAtlasJulich, 'showAtlasJulich'),
    showCarveBrodmann: booleanValue(raw.showCarveBrodmann, fallback.showCarveBrodmann, 'showCarveBrodmann'),
    showCarveDkt: booleanValue(raw.showCarveDkt, fallback.showCarveDkt, 'showCarveDkt'),
    showCarveJulich: booleanValue(raw.showCarveJulich, fallback.showCarveJulich, 'showCarveJulich'),
    showSkull: booleanValue(raw.showSkull, fallback.showSkull, 'showSkull'),
    skullOpacity: unitValue(raw.skullOpacity, fallback.skullOpacity, 'skullOpacity'),
  }
}

export function exportViewerStateSnapshot(): ViewerStateSnapshot {
  return {
    version: VIEWER_STATE_SNAPSHOT_VERSION,
    state: currentSnapshotState(),
  }
}

export function exportViewerStateSnapshotJson(): string {
  return JSON.stringify(exportViewerStateSnapshot(), null, 2)
}

export function parseViewerStateSnapshot(raw: unknown, fallback?: ViewerStateSnapshotState): ViewerStateSnapshot {
  if (!isRecord(raw)) throw new Error('Viewer-State-Snapshot: Root muss ein Objekt sein')
  if (raw.version !== VIEWER_STATE_SNAPSHOT_VERSION) {
    throw new Error(`Viewer-State-Snapshot: Snapshot-Version "${String(raw.version)}" wird nicht unterstuetzt`)
  }
  return {
    version: VIEWER_STATE_SNAPSHOT_VERSION,
    state: parseSnapshotState(raw.state, fallback),
  }
}

export function importViewerStateSnapshot(raw: unknown): void {
  const snapshot = parseViewerStateSnapshot(raw)
  const snapshotState = snapshot.state
  applyRoute(snapshotState.route)
  useViewerStore.setState({
    activePreset: snapshotState.activePreset,
    appMode: snapshotState.appMode,
    cameraPose: snapshotState.cameraPose,
    cameraView: null,
    clipAtlasOverlay: snapshotState.clipAtlasOverlay,
    colorMode: snapshotState.colorMode,
    cutMode: snapshotState.cutMode,
    cuts: snapshotState.cuts,
    hidden: new Set(snapshotState.hidden),
    highlight: snapshotState.highlight,
    isolated: null,
    isolatedSlugs: new Set(),
    isolationPath: [],
    lang: snapshotState.lang,
    mode: snapshotState.mode,
    pickedAtlasArea: snapshotState.pickedAtlasArea,
    pickedAtlasSlug: snapshotState.pickedAtlasSlug,
    rodPhase: snapshotState.rodPhase,
    rodVisible: snapshotState.rodVisible,
    selectMode: snapshotState.selectMode,
    selected: null,
    selectedLabels: null,
    selectedSlugs: new Set(),
    showAtlasDkt: snapshotState.showAtlasDkt,
    showAtlasJulich: snapshotState.showAtlasJulich,
    showCarveBrodmann: snapshotState.showCarveBrodmann,
    showCarveDkt: snapshotState.showCarveDkt,
    showCarveJulich: snapshotState.showCarveJulich,
    showSkull: snapshotState.showSkull,
    skullOpacity: snapshotState.skullOpacity,
  })
  const store = useViewerStore.getState()
  if (snapshotState.selected) store.select(snapshotState.selected)
  if (snapshotState.isolated) store.setIsolated(snapshotState.isolated)
  if (snapshotState.cameraView) store.setCameraView(snapshotState.cameraView)
}

export function importViewerStateSnapshotJson(json: string): void {
  importViewerStateSnapshot(JSON.parse(json))
}
