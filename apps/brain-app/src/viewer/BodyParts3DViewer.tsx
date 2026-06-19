import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ANATOMICAL_COLOR, buildAtlasTree, buildContextTree, flattenStructures, meshColor, type Lang, type Ontology, type OntologyNode } from './ontology'
import { ATLAS_VIEWER_COLORS, PRESET_COLOR_EMISSIVE_INTENSITY } from './atlasColorSystem'
import { parcelColor, prettyAtlasRegion } from './atlasParcels'
import { fetchColorPresets, PRESET_DIM_COLOR, resolvePresetColors, restrictPresetToBuckets } from './colorPresets'
import { useViewerStore, type CutAxis, type CutConfig } from './viewerStore'
import { useEffectiveConfig, type ConfigCuts, type ConfigVisibility, type EffectiveConfig } from './atlas/atlasConfig'
import { buildAliasMapByCarveSlug, loadCatalog, type AtlasCatalog } from './atlas/atlasCatalog'
import { activeCutPlanes, isHiddenByCutSlab } from './cutCapsMerged'
import StructureTree from './StructureTree'
import FooterBar from './FooterBar'
import { hasImportedSnapshotRouteForCurrentLocation } from './viewerStateSnapshot'
import PresetLegend from './PresetLegend'
import GlobalColorLegend from './GlobalColorLegend'
import IsolationBar from './IsolationBar'
import ExplorerLearningFlyout, { learningTargetForNode, type ExplorerLearningTarget } from './ExplorerLearningFlyout'
import {
  responsiveShellMode,
  shellFlexDirection,
  shouldRenderInlineSidebar,
  shouldRenderMobileTreeDrawer,
  viewportFlex,
} from './explorerShellLayout'
import PhineasSidebar from './PhineasSidebar'
import LearnSidebar from '../scene/LearnSidebar'
import { configRegionsToMeshes } from '../scene/brainBridge'
import { ShellControlButton } from './ShellStatePrimitives'
import PerformanceGateProbe, { performanceGateEnabled } from './PerformanceGateProbe'
import { appModeForRegistryLaunch, registryLaunchLocation } from './registryLaunch'
import { loadSettings, useSettingsStore, type RenderQuality } from './settingsStore'
import {
  PREFERS_LIGHT_QUERY,
  PREFERS_REDUCED_MOTION_QUERY,
  applyAppearanceSettings,
  resolveMotionPreference,
  resolveThemePreference,
} from './appearanceRuntime'
import {
  applyAtlasDefaults,
  applyColoringDefaults,
  applyLanguageDefault,
  applyViewportDefaults,
  canApplyFunctionalDefaults,
  rememberAppMode,
  shouldShowModeLauncher,
} from './settingsRuntime'
import { createAnatomicalMaterial, contextAnatomicalMaterialRole, contextColorForMode } from './anatomicalMaterials'
import CameraRig from '../scene/CameraRig'
import SubParcels from './SubParcels'
import EegHeadset from './EegHeadset'
import AuthoringSceneObjects from './AuthoringSceneObjects'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import { AuthoringTransformControls } from './AuthoringTransformControls'
import ManifestAssetObjects from './ManifestAssetObjects'
import ManifestAuthoringBridge from './ManifestAuthoringBridge'
import PhineasGageAssets from './PhineasGageAssets'
import AtlasOverlay from './AtlasOverlay'
import CanonicalAtlasMode from './atlas/CanonicalAtlasMode'
import ModeLauncher from './ModeLauncher'
import { bridgeFor, julichBridgeFor } from './atlas/atlasBridge'
import { approachTransitionValue } from './transitions'
import CutCaps, { CUT_SOURCE_FLAG } from './CutCaps'
import CutPickBridge from './CutPickBridge'
import CutPlaneGizmoBridge from './CutPlaneGizmoBridge'
import { useIsNarrow, useIsTouchLandscape, useMediaQuery } from '../useMediaQuery'
import {
  ROD_RADIUS_SHAFT,
  ROD_RADIUS_TIP,
  rodSegmentForPhase,
} from './phineasGage'
import {
  authoringHistoryActionForKeyboardEvent,
  isEditableKeyboardTarget,
} from './authoringKeyboardShortcuts'

const BRAIN_GLB = '/assets/bodyparts3d/brain.glb'
const SKULL_GLB = '/assets/context/skull.glb'
const HEAD_GLB = '/assets/context/head.glb'
// Watertight-3D-Atlas-Ueber-Objekte (furchen-echt, fsaverage->TARO). Julich nutzt die furchige
// v3.1-Variante; das alte glatte volumetrische julich-brain.glb wurde entfernt (ersetzt).
type Atlas3dKey = 'julich' | 'dkt' | 'brodmann' | 'destrieux'

const ATLAS3D: { key: Atlas3dKey; glb: string; rootLabels: Record<Lang, string> }[] = [
  { key: 'julich', glb: '/assets/bodyparts3d/atlas3d-julich.glb', rootLabels: { de: 'Jülich', la: 'Atlas Julich-Brain', en: 'Julich' } },
  { key: 'dkt', glb: '/assets/bodyparts3d/atlas3d-dkt.glb', rootLabels: { de: 'DKT', la: 'Atlas DKT', en: 'DKT' } },
  { key: 'brodmann', glb: '/assets/bodyparts3d/atlas3d-brodmann.glb', rootLabels: { de: 'Brodmann', la: 'Areae Brodmann', en: 'Brodmann' } },
  { key: 'destrieux', glb: '/assets/bodyparts3d/atlas3d-destrieux.glb', rootLabels: { de: 'Destrieux', la: 'Atlas Destrieux', en: 'Destrieux' } },
]
const ONTOLOGY_URL = '/assets/bodyparts3d/ontology.json'

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
useGLTF.preload(BRAIN_GLB)
useGLTF.preload(SKULL_GLB)
useGLTF.preload(HEAD_GLB)

const SELECT_COLOR = ATLAS_VIEWER_COLORS.selection
const HOVER_COLOR = ATLAS_VIEWER_COLORS.hover
const EMISSIVE_OFF_COLOR = ATLAS_VIEWER_COLORS.emissiveOff
const ROD_COLOR = ATLAS_VIEWER_COLORS.rod
const DIM_DEPTH_WRITE_THRESHOLD = 0.6
const CONFIG_AXIS_TO_CUT_AXIS: Record<'x' | 'y' | 'z', CutAxis> = {
  x: 'sagittal',
  y: 'axial',
  z: 'coronal',
}

// three.js raycastet unsichtbare Objekte trotzdem -> ausgeblendete Meshes muessen explizit
// nicht-pickbar werden, sonst bleiben sie anklickbar/hoverbar.
const NO_RAYCAST = () => {}
function setPickable(mesh: THREE.Mesh, pickable: boolean): void {
  mesh.raycast = pickable ? THREE.Mesh.prototype.raycast : NO_RAYCAST
}

function hasUvAttribute(mesh: THREE.Mesh): boolean {
  return Boolean(mesh.geometry.getAttribute('uv'))
}

function dimOpacityFromConfig(effectiveConfig: EffectiveConfig | null, defaultOpacity: number): number {
  const dimOpacity = effectiveConfig?.visibility.dim_opacity
  if (dimOpacity === undefined) return defaultOpacity
  if (!Number.isFinite(dimOpacity) || dimOpacity < 0 || dimOpacity > 1) {
    throw new Error('Config-Link: visibility.dim_opacity muss zwischen 0 und 1 liegen')
  }
  return dimOpacity
}

function dprForRenderQuality(renderQuality: RenderQuality): number | [number, number] {
  if (renderQuality === 'battery') return 1
  if (renderQuality === 'quality') return [1, 2]
  return [1, 1.5]
}

function emptyConfigCuts(): Record<CutAxis, CutConfig> {
  return {
    sagittal: { on: false, pos: 0 },
    coronal: { on: false, pos: 0 },
    axial: { on: false, pos: 0 },
  }
}

function cutsFromConfig(cuts: ConfigCuts | undefined): Record<CutAxis, CutConfig> {
  const out = emptyConfigCuts()
  if (!cuts?.enabled) return out
  if (!cuts.planes?.length) throw new Error('Config-Link: cuts.enabled=true braucht mindestens eine Schnittebene')
  for (const plane of cuts.planes) {
    if (plane.keep && plane.keep !== 'positive') {
      throw new Error(`Config-Link: cuts.keep="${plane.keep}" wird vom Viewer noch nicht unterstuetzt`)
    }
    out[CONFIG_AXIS_TO_CUT_AXIS[plane.axis]] = { on: true, pos: plane.position }
  }
  return out
}

function uniqueConfigStrings(values: string[] | undefined, field: string): string[] {
  if (!values) return []
  const out: string[] = []
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Config-Link: ${field}[${index}] muss ein nicht-leerer String sein`)
    }
    if (seen.has(value)) throw new Error(`Config-Link: ${field} enthaelt "${value}" doppelt`)
    seen.add(value)
    out.push(value)
  })
  return out
}

function isolatedFromVisibility(visibility: ConfigVisibility): string | null {
  const isolated = uniqueConfigStrings(visibility.isolated, 'visibility.isolated')
  if (isolated.length > 1) {
    throw new Error('Config-Link: visibility.isolated unterstuetzt aktuell genau ein Isolationsziel')
  }
  return isolated[0] ?? null
}

function defaultVisibilityFromConfig(effectiveConfig: EffectiveConfig): { key: string; hidden: string[]; isolated: string | null } | null {
  if (!effectiveConfig.hasUrlConfig && !effectiveConfig.hasUrlPreset) return null
  if (effectiveConfig.hasUrlConfig && !effectiveConfig.activeConfiguration) return null
  const key = effectiveConfig.hasUrlConfig
    ? `config:${effectiveConfig.activeConfiguration}`
    : `preset:${effectiveConfig.preset}`
  return {
    key,
    hidden: uniqueConfigStrings(effectiveConfig.visibility.hidden, 'visibility.hidden'),
    isolated: isolatedFromVisibility(effectiveConfig.visibility),
  }
}

function ConfigLinkStateApplier({ effectiveConfig }: { effectiveConfig: EffectiveConfig | null }) {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setPreset = useViewerStore((s) => s.setPreset)
  const setCuts = useViewerStore((s) => s.setCuts)
  const setCutMode = useViewerStore((s) => s.setCutMode)
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const applyDefaultVisibility = useViewerStore((s) => s.applyDefaultVisibility)
  const [error, setError] = useState<Error | null>(null)
  const routedConfig = useRef<string | null>(null)
  const hasConfigUrl = effectiveConfig?.hasUrlConfig ?? false
  const activeConfiguration = effectiveConfig?.activeConfiguration ?? null
  const configuration = effectiveConfig?.configuration ?? null

  if (error) throw error

  useEffect(() => {
    if (!effectiveConfig || !hasConfigUrl || !activeConfiguration || !configuration) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    setCutMode('slice')
    setCuts(cutsFromConfig(configuration.cuts))
    const defaultVisibility = defaultVisibilityFromConfig(effectiveConfig)
    if (defaultVisibility) {
      applyDefaultVisibility(defaultVisibility.key, defaultVisibility.hidden, defaultVisibility.isolated)
    }
    const carveLayer = configuration.colors?.preset ? 'off' : configuration.view?.carve_on_taro
    setCarveOverlay('julich', carveLayer === 'julich')
    setCarveOverlay('dkt', carveLayer === 'dkt')
    setCarveOverlay('brodmann', false)

    if (configuration.overlay?.scene && appMode === 'explore' && routedConfig.current !== activeConfiguration) {
      routedConfig.current = activeConfiguration
      setAppMode('learn')
      return
    }
    if (appMode === 'explore') setHighlight(configRegionsToMeshes(configuration.regions))
  }, [
    hasConfigUrl,
    activeConfiguration,
    configuration,
    effectiveConfig,
    appMode,
    setAppMode,
    setHighlight,
    setCuts,
    setCutMode,
    setCarveOverlay,
    applyDefaultVisibility,
  ])

  useEffect(() => {
    if (!effectiveConfig?.hasUrlPreset || effectiveConfig.hasUrlConfig) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    const defaultVisibility = defaultVisibilityFromConfig(effectiveConfig)
    if (defaultVisibility) {
      applyDefaultVisibility(defaultVisibility.key, defaultVisibility.hidden, defaultVisibility.isolated)
    }
  }, [effectiveConfig, applyDefaultVisibility])

  useEffect(() => {
    if (!hasConfigUrl || !activeConfiguration || !configuration) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    let alive = true
    const presetId = configuration.colors?.preset
    if (!presetId) {
      setPreset(null)
      return () => { alive = false }
    }
    fetchColorPresets()
      .then((presets) => {
        if (!alive) return
        const preset = presets.find((item) => item.id === presetId)
        if (!preset) throw new Error(`Config-Link: Farb-Preset "${presetId}" nicht gefunden`)
        const configPreset = restrictPresetToBuckets(preset, configuration.regions?.buckets ?? [], activeConfiguration)
        setPreset({
          ...configPreset,
          dimOthers: configuration.colors?.dim_others ?? preset.dimOthers,
        })
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => { alive = false }
  }, [hasConfigUrl, activeConfiguration, configuration, setPreset])

  return null
}

/** Alle aktiven Schnittebenen auf die Materialien einer Mesh-Liste anwenden (leer = kein Schnitt).
 *  Nur im 'slice'-Modus wird geschnitten; im 'hide'-Modus bleibt die Geometrie ungeschnitten. */
function useClipPlanes(meshes: THREE.Mesh[]): void {
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const planes = useMemo(() => (cutMode === 'slice' ? activeCutPlanes(cuts) : []), [cuts, cutMode])
  useEffect(() => {
    for (const mesh of meshes) (mesh.material as THREE.MeshStandardMaterial).clippingPlanes = planes
  }, [meshes, planes])
}

const NEVER_HIDDEN = (): boolean => false
/** Predikat fuer den 'hide'-Modus: blendet Strukturen aus, die vollstaendig hinter einer Ebene
 *  liegen. Im 'slice'-Modus stabil NEVER_HIDDEN — die Sichtbarkeits-Effekte laufen nicht extra. */
function useCutHidden(): (mesh: THREE.Mesh) => boolean {
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  return useMemo(() => {
    if (cutMode !== 'hide') return NEVER_HIDDEN
    return (mesh: THREE.Mesh) => isHiddenByCutSlab(mesh, cuts)
  }, [cuts, cutMode])
}

function Brain({ dimOpacity }: { dimOpacity: number }) {
  const { scene } = useGLTF(BRAIN_GLB)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const highlight = useViewerStore((s) => s.highlight)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const colorIndex = useViewerStore((s) => s.colorIndex)
  const activePreset = useViewerStore((s) => s.activePreset)
  const presetViewOptions = useViewerStore((s) => s.presetViewOptions)
  const erpActive = useViewerStore((s) => s.erpActive)
  const erpPulse = useViewerStore((s) => s.erpPulse)
  const opacityTargets = useRef(new Map<THREE.Mesh, number>())
  const opacityTransitionActive = useRef(false)
  // Figur-Preset: Mesh -> Hex. Nur bei colorMode='preset' wirksam; wirft laut bei Luecken-Bucket.
  const presetColors = useMemo(
    () => (activePreset ? resolvePresetColors(activePreset) : null),
    [activePreset],
  )
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        const materialRole = colorIndex.get(mesh.name)?.anatomicalRole ?? 'brain-cortex'
        mesh.material = createAnatomicalMaterial(materialRole, {
          // Halb-Meshes (L/R-Haelften) sind am Mittelschnitt offen; DoubleSide stellt
          // sicher, dass nichts durch Backface-Culling unsichtbar wird.
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        list.push(mesh)
      }
    })
    return list
  }, [scene, colorIndex])

  useClipPlanes(meshes)

  const setOpacityTarget = (mesh: THREE.Mesh, targetOpacity: number) => {
    opacityTargets.current.set(mesh, targetOpacity)
    opacityTransitionActive.current = true
  }

  useFrame((_, delta) => {
    if (!opacityTransitionActive.current) return
    let stillActive = false
    for (const [mesh, targetOpacity] of opacityTargets.current) {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.opacity = approachTransitionValue(material.opacity, targetOpacity, delta)
      const transparent = material.opacity < 0.999
      if (material.transparent !== transparent) {
        material.transparent = transparent
        material.needsUpdate = true
      }
      material.depthWrite = material.opacity > DIM_DEPTH_WRITE_THRESHOLD
      if (material.opacity !== targetOpacity) stillActive = true
    }
    opacityTransitionActive.current = stillActive
  })

  useEffect(() => {
    const highlightSet = new Set(highlight)
    // Waehrend einer Animation (Highlight-Set aktiv) werden nicht-aktive Strukturen
    // transparent, damit die tiefen Strukturen (Striatum, Pallidum, Thalamus) durch
    // den Cortex sichtbar werden.
    const presetViewActive = colorMode === 'preset' && Boolean(presetColors && activePreset)
    const sceneHighlightActive = highlightSet.size > 0 && !presetViewActive
    const hidePresetUncolored = presetViewActive
    const focusPresetColored = presetViewActive && presetViewOptions.focusColored
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const presetColor = presetColors?.get(mesh.name)
      const isPresetColored = Boolean(presetColor)
      // Hierarchisches Ein-/Ausblenden ueber den Baum: unsichtbar UND nicht pickbar.
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh) && !(hidePresetUncolored && !isPresetColored)
      mesh.visible = visible
      // Fokusmodus: gleicher Opacity-/Pickability-Pfad wie Isolation. Bei Figur-Faerbung kann
      // das aktive Preset die Fokusmenge liefern, damit subkortikale Gruppen sichtbar werden.
      const focusDimmed = focusPresetColored ? !isPresetColored : iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !focusDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      // Basisfarbe nach aktivem Farbmodus (Auswahl/Hover ueberlagern als Emissive).
      // Preset-Modus: Gruppen-Farbe je Mesh; nicht-gruppierte Strukturen gedimmt (dimOthers).
      if (colorMode === 'preset' && presetColors && activePreset) {
        material.color.set(presetColor ?? (activePreset.dimOthers ? PRESET_DIM_COLOR : ANATOMICAL_COLOR))
      } else {
        material.color.set(meshColor(colorIndex.get(mesh.name), colorMode))
      }
      const isActive = !presetViewActive && (selectedSlugs.has(mesh.name) || highlightSet.has(mesh.name))
      if (presetViewActive && presetColor) {
        material.emissive.set(presetColor)
        material.emissiveIntensity = PRESET_COLOR_EMISSIVE_INTENSITY
      } else if (isActive) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (!presetViewActive && mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      const dim = visible && ((sceneHighlightActive && !isActive) || focusDimmed)
      setOpacityTarget(mesh, dim ? dimOpacity : 1)
    }
  }, [
    meshes,
    selectedSlugs,
    hovered,
    highlight,
    hidden,
    isolatedSlugs,
    colorMode,
    colorIndex,
    presetColors,
    activePreset,
    presetViewOptions,
    cutHidden,
    dimOpacity,
  ])

  // EEG voll-synchron fuer brain.glb-Quellen (z.B. P3b parietal): pulst NUR die gehighlighteten
  // Meshes mit der ERP-Huellkurve. Bewusst eigener, leichter Effekt (laeuft per Frame ueber
  // erpPulse, beruehrt aber nur das kleine Highlight-Set) statt den schweren Farb-Effekt oben
  // (600+ Meshes) in den Render-Pfad zu ziehen. Sub-Patch-Quellen (P3a/P3z) laufen ueber SubParcels.
  useEffect(() => {
    if (!erpActive) return
    const highlightSet = new Set(highlight)
    const intensity = 0.15 + 0.85 * erpPulse
    for (const mesh of meshes) {
      if (highlightSet.has(mesh.name)) (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
    }
  }, [meshes, highlight, erpActive, erpPulse])

  // DEV-only: Szene + THREE global exponieren, damit das Koordinaten-Bake (scripts/bake-structure-coords.mjs)
  // und kuenftige Punkt-/Verbinder-Animationen die Geometrie im Viewer-Raum traversieren koennen.
  // Bewusst dauerhaft (nur DEV) — nicht entfernen.
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as { __THREE__: unknown }).__THREE__ = THREE
      ;(window as unknown as { __THREE_SCENE__: unknown }).__THREE_SCENE__ = scene
    }
  }, [scene])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

/** Kontext-Schaedel (Phineas-Gage-Layer). Default versteckt; nicht anklickbar, damit die
 * Hirn-Auswahl frei bleibt. Deckkraft von der Szene gesteuert (transparent = Hirn sichtbar). */
function ContextSkull({ dimOpacity }: { dimOpacity: number }) {
  const { scene } = useGLTF(SKULL_GLB)
  const appMode = useViewerStore((s) => s.appMode)
  const showSkull = useViewerStore((s) => s.showSkull)
  const skullOpacity = useViewerStore((s) => s.skullOpacity)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = createAnatomicalMaterial('bone', {
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
          transparent: true,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  // Sichtbar via Phineas-Szene (showSkull, halbtransparent) ODER via Baum-Toggle (solide).
  // Praemisse: was sichtbar ist, ist auch pickbar; Ausgeblendetes nicht.
  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = appMode !== 'phineas' && (showSkull || !hidden.has(mesh.name)) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.set(contextColorForMode(mesh.name, colorMode))
      const opacity = isoDimmed ? dimOpacity : showSkull ? skullOpacity : 1
      material.opacity = opacity
      material.depthWrite = opacity > DIM_DEPTH_WRITE_THRESHOLD
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.6
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.3
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      material.needsUpdate = true
    }
  }, [meshes, appMode, showSkull, skullOpacity, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity, colorMode])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

/** Voller Kopf-Kontext (Vollausbau): per Baum-Toggle ein-/ausblendbar, anklickbar. */
function ContextHead({ dimOpacity }: { dimOpacity: number }) {
  const { scene } = useGLTF(HEAD_GLB)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = createAnatomicalMaterial(contextAnatomicalMaterialRole(mesh.name), {
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed) // ausgeblendet/isoliert-aussen -> nicht pickbar
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.set(contextColorForMode(mesh.name, colorMode))
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      if (material.transparent !== isoDimmed) material.needsUpdate = true
      material.transparent = isoDimmed
      material.opacity = isoDimmed ? dimOpacity : 1
      material.depthWrite = !isoDimmed
    }
  }, [meshes, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity, colorMode])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

/** Watertight-3D-Atlas-Ueber-Objekt (furchen-echt, Y-up, eigene saubere Geometrie — NICHT auf TARO
 *  gecarvt). Pro Areal eine stabile Farbe; default versteckt, per Strukturbaum-Toggle einblendbar,
 *  anklickbar (Picking ueber Mesh-Name = Slug). Baut beim ersten Laden den Atlas-Teilbaum und
 *  registriert ihn im Store (Julich -> setJulich, sonst -> setAtlas3d). */
function AtlasOverObject({
  atlasKey,
  glb,
  rootLabels,
  aliasesByName,
  dimOpacity,
}: {
  atlasKey: Atlas3dKey
  glb: string
  rootLabels: Record<Lang, string>
  aliasesByName?: ReadonlyMap<string, string[]>
  dimOpacity: number
}) {
  const { scene } = useGLTF(glb)
  const setJulich = useViewerStore((s) => s.setJulich)
  const setAtlas3d = useViewerStore((s) => s.setAtlas3d)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          // Cerebellum/Hirnstamm = Kontext (gedaempft); GapMaps = "nicht-kartierte" Rest-Zonen (neutral,
          // damit sie nicht dominieren); echte zytoarchitektonische Areale = stabile Farbe (L/R teilen sie).
          color: /cerebellum|brainstem/.test(mesh.name)
            ? ATLAS_VIEWER_COLORS.atlasContext
            : /gapmap/.test(mesh.name)
              ? ATLAS_VIEWER_COLORS.atlasGap
              : parcelColor(mesh.name),
          roughness: 0.82,
          metalness: 0,
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  // Teilbaum aus den Mesh-Namen bauen + im Store registrieren (alle Areale starten versteckt).
  useEffect(() => {
    const names = meshes.map((m) => m.name).filter(Boolean)
    if (!names.length) return
    const { tree, slugs } = buildAtlasTree(atlasKey, rootLabels, names, prettyAtlasRegion, aliasesByName)
    if (atlasKey === 'julich') setJulich(tree, slugs)
    else setAtlas3d(atlasKey, tree, slugs)
  }, [meshes, atlasKey, rootLabels, aliasesByName, setJulich, setAtlas3d])

  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      if (material.transparent !== isoDimmed) material.needsUpdate = true
      material.transparent = isoDimmed
      material.opacity = isoDimmed ? dimOpacity : 1
      material.depthWrite = !isoDimmed
    }
  }, [meshes, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity])

  return <primitive object={scene} />
}

/** Tampiereisen entlang der rekonstruierten Trajektorie (Eintritt Wange -> Austritt Scheitel),
 * spitz zulaufend, ueber den Schaedel hinaus verlaengert. */
function TampingIron() {
  const appMode = useViewerStore((s) => s.appMode)
  const rodVisible = useViewerStore((s) => s.rodVisible)
  const rodPhase = useViewerStore((s) => s.rodPhase)
  const meshRef = useRef<THREE.Mesh>(null)
  const renderedPhase = useRef(0)

  const applySegment = (phase: number) => {
    const mesh = meshRef.current
    if (!mesh) return
    const segment = rodSegmentForPhase(phase)
    const tail = new THREE.Vector3(...segment.tail)
    const tip = new THREE.Vector3(...segment.tip)
    const dir = tip.clone().sub(tail).normalize()
    mesh.position.copy(tail.clone().add(tip).multiplyScalar(0.5))
    mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
    mesh.scale.set(1, segment.length, 1)
  }

  useEffect(() => {
    if (!rodVisible) renderedPhase.current = 0
  }, [rodVisible])

  useFrame((_, delta) => {
    if (!rodVisible) return
    renderedPhase.current = approachTransitionValue(renderedPhase.current, rodPhase, delta, 0.005)
    applySegment(renderedPhase.current)
  })

  if (!rodVisible || appMode === 'phineas') return null
  // +Y-Ende liegt an der vorlaufenden Spitze, -Y-Ende am dickeren Schaft.
  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[ROD_RADIUS_TIP, ROD_RADIUS_SHAFT, 1, 24]} />
      <meshStandardMaterial color={ROD_COLOR} roughness={0.5} metalness={0.6} />
    </mesh>
  )
}

/** Shell-Komponente: waehlt Sidebar nach appMode, koppelt HUD/Overlays an Modus. */
export default function BodyParts3DViewer() {
  const effectiveConfig = useEffectiveConfig()
  const [catalogForAliases, setCatalogForAliases] = useState<AtlasCatalog | null>(null)
  const [catalogAliasError, setCatalogAliasError] = useState<Error | null>(null)
  const setOntology = useViewerStore((s) => s.setOntology)
  const setContext = useViewerStore((s) => s.setContext)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const setAtlasFocus = useViewerStore((s) => s.setAtlasFocus)
  const ontology = useViewerStore((s) => s.ontology)
  const context = useViewerStore((s) => s.context)
  const selected = useViewerStore((s) => s.selected)
  const selectedLabels = useViewerStore((s) => s.selectedLabels)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hidden = useViewerStore((s) => s.hidden)
  const selectMode = useViewerStore((s) => s.selectMode)
  const select = useViewerStore((s) => s.select)
  const setHidden = useViewerStore((s) => s.setHidden)
  const setIsolated = useViewerStore((s) => s.setIsolated)
  const lang = useViewerStore((s) => s.lang)
  const appMode = useViewerStore((s) => s.appMode)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const pickedAtlasArea = useViewerStore((s) => s.pickedAtlasArea)
  const pickedAtlasSlug = useViewerStore((s) => s.pickedAtlasSlug)
  const hoveredAtlasArea = useViewerStore((s) => s.hoveredAtlasArea)
  const setPickedAtlasArea = useViewerStore((s) => s.setPickedAtlasArea)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  const atlasOnBrain = showCarveJulich || showCarveDkt || showCarveBrodmann
  const atlasAreaLabel = pickedAtlasArea ?? hoveredAtlasArea ?? 'Areal anklicken'
  const defaultCameraView = useSettingsStore((s) => s.viewport.defaultCameraView)
  const skullContext = useSettingsStore((s) => s.viewport.skullContext)
  const autoRotate = useSettingsStore((s) => s.viewport.autoRotate)
  const renderQuality = useSettingsStore((s) => s.viewport.renderQuality)
  const defaultColorMode = useSettingsStore((s) => s.coloring.defaultColorMode)
  const dimOthers = useSettingsStore((s) => s.coloring.dimOthers)
  const settingsDimOpacity = useSettingsStore((s) => s.coloring.dimOpacity)
  const primaryLanguage = useSettingsStore((s) => s.language.primary)
  const defaultAtlasLayer = useSettingsStore((s) => s.atlas.defaultLayer)
  const visibleCollectionsKey = useSettingsStore((s) => s.atlas.visibleCollections.join('\u0000'))
  const visibleCollections = useMemo(
    () => (visibleCollectionsKey ? visibleCollectionsKey.split('\u0000') : []),
    [visibleCollectionsKey],
  )
  const themePreference = useSettingsStore((s) => s.display.theme)
  const contrast = useSettingsStore((s) => s.display.contrast)
  const fontSize = useSettingsStore((s) => s.display.fontSize)
  const quietMode = useSettingsStore((s) => s.accessibility.quietMode)
  const motionPreference = useSettingsStore((s) => s.accessibility.motion)
  const focusRings = useSettingsStore((s) => s.accessibility.focusRings)
  const readableFont = useSettingsStore((s) => s.accessibility.readableFont)
  const updateSettingsCategory = useSettingsStore((s) => s.updateCategory)
  const dimOpacity = dimOpacityFromConfig(effectiveConfig, settingsDimOpacity)
  const renderDpr = dprForRenderQuality(renderQuality)
  const perfGate = useMemo(() => performanceGateEnabled(), [])

  if (catalogAliasError) throw catalogAliasError

  useEffect(() => {
    if (effectiveConfig?.catalog) {
      setCatalogForAliases(effectiveConfig.catalog)
      return
    }
    let active = true
    loadCatalog()
      .then((catalog) => {
        if (active) setCatalogForAliases(catalog)
      })
      .catch((error: unknown) => {
        if (!active) return
        setCatalogAliasError(error instanceof Error ? error : new Error(String(error)))
      })
    return () => {
      active = false
    }
  }, [effectiveConfig?.catalog])

  const atlasAliases = useMemo(() => {
    const catalog = effectiveConfig?.catalog ?? catalogForAliases
    return {
      julich: catalog ? buildAliasMapByCarveSlug(catalog, 'julich') : undefined,
      dkt: catalog ? buildAliasMapByCarveSlug(catalog, 'dkt') : undefined,
      brodmann: catalog ? buildAliasMapByCarveSlug(catalog, 'brodmann') : undefined,
      destrieux: catalog ? buildAliasMapByCarveSlug(catalog, 'destrieux') : undefined,
    } satisfies Record<Atlas3dKey, ReadonlyMap<string, string[]> | undefined>
  }, [effectiveConfig?.catalog, catalogForAliases])

  const isNarrow = useIsNarrow()
  const isTouchLandscape = useIsTouchLandscape()
  const shellMode = responsiveShellMode({ isNarrow, isTouchLandscape })
  const prefersLight = useMediaQuery(PREFERS_LIGHT_QUERY)
  const prefersReducedMotion = useMediaQuery(PREFERS_REDUCED_MOTION_QUERY)
  const resolvedTheme = resolveThemePreference(themePreference, prefersLight)
  const reduceMotion = resolveMotionPreference(motionPreference, prefersReducedMotion) === 'reduce'

  // Start-Screen (Modus-Wahl) beim ersten Laden — Settings duerfen nur beim normalen App-Start
  // ueberspringen, Deep-Links behalten immer Vorrang.
  const [launched, setLaunched] = useState(() => !shouldShowModeLauncher(window.location.search, loadSettings()))
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)

  useEffect(() => {
    applyAppearanceSettings({
      display: { theme: themePreference, contrast, fontSize },
      accessibility: { quietMode, motion: motionPreference, focusRings, readableFont },
    }, document.documentElement, { prefersLight, prefersReducedMotion })
  }, [contrast, focusRings, fontSize, motionPreference, prefersLight, prefersReducedMotion, quietMode, readableFont, themePreference])

  useEffect(() => {
    if (shellMode !== 'portrait-drawer' || appMode !== 'explore') setMobileTreeOpen(false)
  }, [shellMode, appMode])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (appMode === 'phineas') return
    if (!canApplyFunctionalDefaults()) return
    applyViewportDefaults({ viewport: { defaultCameraView, skullContext } })
  }, [appMode, defaultCameraView, launched, skullContext])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyColoringDefaults({ coloring: { defaultColorMode, dimOthers } })
  }, [defaultColorMode, dimOthers, launched])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyLanguageDefault({ language: { primary: primaryLanguage } })
  }, [launched, primaryLanguage])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyAtlasDefaults({ atlas: { defaultLayer: defaultAtlasLayer, visibleCollections } })
  }, [defaultAtlasLayer, launched, visibleCollections])

  useEffect(() => {
    if (launched) rememberAppMode(appMode)
  }, [appMode, launched])

  useEffect(() => {
    if (shellMode === 'portrait-drawer' && appMode === 'explore' && selected) setMobileTreeOpen(false)
  }, [shellMode, appMode, selected])

  useEffect(() => {
    let active = true
    fetch(ONTOLOGY_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`ontology.json laden fehlgeschlagen: HTTP ${res.status}`)
        return res.json() as Promise<Ontology>
      })
      .then((data) => {
        if (active) setOntology(data)
      })
    return () => {
      active = false
    }
  }, [setOntology])

  // Kontext-Vollausbau (Schaedel + Kopf) aus den Manifesten: Teilbaum bauen, default versteckt.
  useEffect(() => {
    let active = true
    Promise.all([
      fetch(HEAD_GLB.replace('head.glb', 'head.json')).then((r) => {
        if (!r.ok) throw new Error(`head.json: HTTP ${r.status}`)
        return r.json()
      }),
      fetch(SKULL_GLB.replace('skull.glb', 'skull.json')).then((r) => {
        if (!r.ok) throw new Error(`skull.json: HTTP ${r.status}`)
        return r.json()
      }),
    ]).then(([head, skull]) => {
      if (!active) return
      const { tree, slugs } = buildContextTree(head, skull)
      setContext(tree, slugs)
    })
    return () => {
      active = false
    }
  }, [setContext])

  // Tastatur-Shortcuts (Illustrator-artig). h=hide-Toggle, Shift+H=alles zeigen,
  // i=isolieren, Shift+I=Isolation aus, Esc=eine Ebene hoch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) return // Suchfeld/Textbearbeitung nicht stoeren
      const historyAction = authoringHistoryActionForKeyboardEvent(e)
      if (historyAction) {
        e.preventDefault()
        const store = useAuthoringSnapshotStore.getState()
        if (historyAction === 'undo') store.undoAuthoringCommand()
        else store.redoAuthoringCommand()
        return
      }
      const s = useViewerStore.getState()
      const k = e.key.toLowerCase()
      if (k === 'f') {
        e.preventDefault()
        document.documentElement.requestFullscreen?.()
        return
      }
      if (k === 'h') {
        e.preventDefault()
        if (e.shiftKey) return s.clearHidden()
        const slugs = [...s.selectedSlugs]
        if (!slugs.length) return
        const anyVisible = slugs.some((x) => !s.hidden.has(x))
        s.setHidden(slugs, anyVisible) // sichtbar -> ausblenden, sonst einblenden
      } else if (k === 'i') {
        e.preventDefault()
        if (e.shiftKey) return s.setIsolated(null)
        if (s.selected) s.setIsolated(s.selected)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        // Erst die Auswahl aufheben; erst der naechste ESC wickelt den Drilldown (Isolation) zurueck.
        if (s.selected) s.select(null)
        else s.isolateUp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const julich = useViewerStore((s) => s.julich)
  const bySlug = useMemo(() => {
    const map = new Map<string, OntologyNode>()
    if (ontology) for (const node of flattenStructures(ontology.tree)) map.set(node.id, node)
    if (context) for (const node of flattenStructures(context)) map.set(node.id, node)
    if (julich) for (const node of flattenStructures(julich)) map.set(node.id, node)
    return map
  }, [ontology, context, julich])

  const selectedNode = selected ? bySlug.get(selected) ?? null : null
  const selectedLearningTarget = useMemo(() => learningTargetForNode(selectedNode), [selectedNode])
  const [closedLearningFlyoutFor, setClosedLearningFlyoutFor] = useState<string | null>(null)
  useEffect(() => {
    if (!selected) setClosedLearningFlyoutFor(null)
  }, [selected])

  const isExploreMode = appMode === 'explore'
  // Atlas-Modus zeigt das kanonische fsaverage-Hirn (NICHT TARO) -> eigener Canvas-Zweig statt
  // TARO-Viewport + Sidebar. Kopfleiste und Fussleiste (Modus-Wechsel) bleiben erhalten.
  const isAtlas = appMode === 'atlas'
  const sidebar =
    appMode === 'learn' ? <LearnSidebar /> : appMode === 'phineas' ? <PhineasSidebar /> : <StructureTree />
  const renderInlineSidebar = shouldRenderInlineSidebar({ appMode, isAtlas, shellMode })
  const renderMobileTreeDrawer = shouldRenderMobileTreeDrawer({ appMode, isAtlas, shellMode, mobileTreeOpen })
  const atlasTarget = bridgeFor(selected)
  const selectedSlugList = useMemo(() => [...selectedSlugs], [selectedSlugs])
  const selectionHasVisibleSlugs = selectedSlugList.some((slug) => !hidden.has(slug))
  const toggleSelectedVisibility = () => {
    if (!selectedSlugList.length) return
    setHidden(selectedSlugList, selectionHasVisibleSlugs)
  }
  const isolateSelected = () => {
    if (selected) setIsolated(selected)
  }
  const showLearningFlyout = Boolean(
    isExploreMode &&
    selected &&
    selectedNode &&
    selectedLearningTarget &&
    closedLearningFlyoutFor !== selected,
  )
  const openExplorerTarget = (target: ExplorerLearningTarget) => {
    if (!target.launch) return
    window.history.replaceState(null, '', registryLaunchLocation(target.launch))
    setLaunched(true)
    setAppMode(appModeForRegistryLaunch(target.launch))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--app-bg)', padding: 10, boxSizing: 'border-box' }}>
      {!launched && (
        <ModeLauncher
          onPick={(m) => {
            setAppMode(m)
            setLaunched(true)
          }}
        />
      )}
      {/* Editorial-"Plate": Tinte-Rahmen um die ganze App (fhead / Mitte / Schriftfeld). */}
      <div
        className="ed-frame app-shell"
        aria-hidden={!launched}
        inert={!launched ? true : undefined}
        style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--shell-panel-bg)' }}
      >
        {/* ── Kopfleiste (fhead) ── */}
        <div
          className="ed-head"
          style={{
            position: 'relative',
            flex: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: isNarrow ? '9px 12px' : '12px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 'none' }}>
            {/* Logo wie im Sample (.fhead .mark): 26px hoch, width auto. Tinte auf Papier, Weiss auf Dunkel. */}
            <img
              src={resolvedTheme === 'light' ? '/assets/brand/logo-ink.png' : '/assets/brand/logo-white.png'}
              alt="Marcus Ifland"
              style={{ height: isNarrow ? 22 : 26, width: 'auto', display: 'block' }}
            />
          </div>

          {/* App-Name mittig (nur breite Viewports — auf schmalen weicht er der Navigation). */}
          {!isNarrow && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 28px',
                borderLeft: '1.5px solid var(--line)',
                borderRight: '1.5px solid var(--line)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--ed-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                Iflands Neuro Lernvergnügen
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: isNarrow ? 8 : 14, alignItems: 'center', flex: 'none', minWidth: 0 }}>
            {isNarrow ? (
              // Platzsparender Ein-Tasten-Umschalter auf schmalen Viewports.
              <button
                type="button"
                className="ed-btn"
                style={{ padding: '4px 9px', flex: 'none' }}
                onClick={() => updateSettingsCategory('display', { theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
                aria-label="Theme umschalten"
              >
                {resolvedTheme === 'dark' ? 'Hell' : 'Dunkel'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Theme umschalten">
                <button type="button" className={`ed-btn${resolvedTheme === 'dark' ? ' active' : ''}`} style={{ padding: '4px 9px' }} onClick={() => updateSettingsCategory('display', { theme: 'dark' })}>
                  Dunkel
                </button>
                <button type="button" className={`ed-btn${resolvedTheme === 'light' ? ' active' : ''}`} style={{ padding: '4px 9px' }} onClick={() => updateSettingsCategory('display', { theme: 'light' })}>
                  Hell
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Breadcrumb-Band: reservierter Bereich direkt unter der Kopfleiste (nur bei aktiver
            Isolation sichtbar; eigene Zeile, kein Overlay ueber die Struktur-HUD). ── */}
        <IsolationBar />

        {/* ── Mitte: 3D-Viewport (dunkle "Cover-Flaeche") + Struktur-/Inhalts-Spalte ──
            ResponsiveShellMode entscheidet Split, Portrait-Drawer oder Landscape-Rail. */}
        <div
          data-responsive-shell={shellMode}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: shellFlexDirection(shellMode),
            minHeight: 0,
            position: 'relative',
          }}
        >
          <div
            style={{
              // Portrait: feste Hoehen-Zone oben; Split/Rail: nimmt den Restraum links.
              // Atlas-Modus hat keine Sidebar -> Viewport nimmt die volle Breite/Hoehe.
              flex: viewportFlex({ appMode, isAtlas, shellMode }),
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
              // 3D-Bereich bleibt in beiden Themes dunkel (Cover-Split-Logik).
              background: 'var(--viewport-bg)',
              // Cursor signalisiert das aktive Auswahl-Werkzeug (Gruppe=default, direkt=crosshair).
              cursor: selectMode === 'direct' ? 'crosshair' : 'default',
            }}
          >
            {isAtlas ? (
              <CanonicalAtlasMode />
            ) : (
            <>
            <ConfigLinkStateApplier effectiveConfig={effectiveConfig} />
            <ManifestAuthoringBridge />
            <Canvas
              camera={{ position: [0, 30, 320], fov: 40, near: 1, far: 4000 }}
              dpr={renderDpr}
              // stencil: true ist Pflicht — die Cap-Pipeline (CutCapsMerged) maskiert die
              // Schnittflaechen ueber den Stencil-Buffer. R3F erstellt den Context sonst
              // ohne Stencil (stencilBits=0), wodurch die Caps unmaskiert als volle Plane rendern.
              gl={{
                stencil: true,
                preserveDrawingBuffer: perfGate,
                powerPreference: renderQuality === 'battery' ? 'low-power' : 'high-performance',
              }}
              onCreated={({ gl }) => {
                gl.localClippingEnabled = true // Schnittebenen (Clipping) aktivieren
                gl.outputColorSpace = THREE.SRGBColorSpace
                gl.toneMapping = THREE.ACESFilmicToneMapping
                gl.toneMappingExposure = 1.04
              }}
            >
              <ambientLight intensity={0.38} />
              <hemisphereLight args={[0xf8efe5, 0x181818, 0.42]} />
              <directionalLight position={[120, 200, 160]} intensity={1.4} />
              <directionalLight position={[-160, -80, -200]} intensity={0.28} />
              <Suspense fallback={null}>
                <Brain dimOpacity={dimOpacity} />
                <ContextSkull dimOpacity={dimOpacity} />
                <ContextHead dimOpacity={dimOpacity} />
                {ATLAS3D.map((a) => (
                  <AtlasOverObject
                    key={a.key}
                    atlasKey={a.key}
                    glb={a.glb}
                    rootLabels={a.rootLabels}
                    aliasesByName={atlasAliases[a.key]}
                    dimOpacity={dimOpacity}
                  />
                ))}
                <SubParcels />
                <EegHeadset />
                <AuthoringSceneObjects />
                <ManifestAssetObjects dimOpacity={dimOpacity} />
                <PhineasGageAssets />
                <AtlasOverlay effectiveConfig={effectiveConfig} />
                <CutCaps />
              </Suspense>
              <TampingIron />
              <CutPickBridge />
              <OrbitControls makeDefault enableDamping autoRotate={autoRotate && !reduceMotion} autoRotateSpeed={0.35} />
              <CutPlaneGizmoBridge />
              <CameraRig />
              {perfGate ? <PerformanceGateProbe /> : null}
            </Canvas>
            <AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />

            {/* HUD + Vertiefungs-Trigger nur im Explorer-Modus (floating). Authoring-Werkzeuge
                liegen nur im aktiven Asset-Edit als Viewport-Toolbar darueber. */}
            {isExploreMode && (
              <div
                className="ed-panel ed-frame"
                style={{
                  position: 'absolute',
                  top: isNarrow ? 8 : 16,
                  left: isNarrow ? 8 : 16,
                  right: isNarrow ? 8 : undefined,
                  padding: isNarrow ? '9px 10px' : '11px 15px',
                  pointerEvents: 'none',
                  maxWidth: isNarrow ? undefined : 420,
                  zIndex: 12,
                }}
              >
                <div className="eyebrow">Struktur</div>
                <div style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 17, color: 'var(--ink)', marginTop: 5, lineHeight: 1.15 }}>
                  {selectedLabels ? selectedLabels[lang] : 'Struktur anklicken'}
                </div>
                {isNarrow && selected ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9, pointerEvents: 'auto' }}>
                    <ShellControlButton
                      disabledReason={selectedSlugList.length ? null : 'Erst eine Struktur auswählen'}
                      style={{ padding: '6px 9px' }}
                      onClick={toggleSelectedVisibility}
                    >
                      {selectionHasVisibleSlugs ? 'Ausblenden' : 'Einblenden'}
                    </ShellControlButton>
                    <button
                      type="button"
                      className="ed-btn"
                      style={{ padding: '6px 9px' }}
                      onClick={isolateSelected}
                    >
                      Isolieren
                    </button>
                    <button
                      type="button"
                      className="ed-btn"
                      style={{ padding: '6px 9px' }}
                      onClick={() => select(null)}
                    >
                      Lösen
                    </button>
                  </div>
                ) : null}
                {selectedNode?.k11Role ? (
                  <div style={{ marginTop: 8 }}>
                    <span className="ed-pill orange">{selectedNode.k11Role}</span>
                  </div>
                ) : null}
                {/* Bruecke Funktion->Struktur: fuer Kapitel-11-Regionen zum praezisen fsaverage-Areal springen. */}
                {atlasTarget ? (
                  <button
                    type="button"
                    className="ed-btn"
                    style={{ pointerEvents: 'auto', marginTop: 10, padding: '5px 11px' }}
                    onClick={() => {
                      setAtlasFocus({ layer: atlasTarget.layer, name: atlasTarget.name })
                      setAppMode('atlas')
                    }}
                  >
                    Im Atlas zeigen →
                  </button>
                ) : null}
              </div>
            )}
            {shellMode === 'portrait-drawer' && isExploreMode && !showLearningFlyout ? (
              <button
                type="button"
                className="ed-btn"
                aria-label={mobileTreeOpen ? 'Strukturbaum schließen' : 'Strukturbaum öffnen'}
                onClick={() => setMobileTreeOpen((open) => !open)}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  zIndex: 16,
                  padding: '7px 11px',
                }}
              >
                Strukturbaum
              </button>
            ) : null}
            {showLearningFlyout && selectedNode && selectedLearningTarget ? (
              <ExplorerLearningFlyout
                node={selectedNode}
                target={selectedLearningTarget}
                atlasAvailable={Boolean(atlasTarget)}
                compact={isNarrow}
                onClose={() => setClosedLearningFlyoutFor(selected)}
                onOpenAtlas={() => {
                  if (!atlasTarget) return
                  setAtlasFocus({ layer: atlasTarget.layer, name: atlasTarget.name })
                  setAppMode('atlas')
                }}
                onOpenTarget={openExplorerTarget}
              />
            ) : null}

            <PresetLegend />
            {isExploreMode ? <GlobalColorLegend /> : null}
            {/* Atlas-auf-Hirn aktiv: geklicktes Areal benennen (oben rechts, kollidiert nicht mit der
                Struktur-HUD links). Carve liegt 0 mm auf TARO -> Klick trifft das echte Areal. */}
            {atlasOnBrain && (
              <div
                className="ed-panel ed-frame"
                style={{ position: 'absolute', top: 16, right: 16, padding: '9px 14px', pointerEvents: 'none', maxWidth: 280 }}
              >
                <div className="eyebrow">Atlas-Areal{showCarveDkt ? ' · DKT' : showCarveJulich ? ' · Julich' : showCarveBrodmann ? ' · Brodmann' : ''}</div>
                <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 13, fontWeight: 600, color: pickedAtlasArea ? 'var(--orange)' : hoveredAtlasArea ? 'var(--ink)' : 'var(--g600)', marginTop: 4 }}>
                  {atlasAreaLabel}
                </div>
                <div className="eyebrow" style={{ marginTop: 3, color: 'var(--g500)' }}>
                  {pickedAtlasArea ? 'ausgewählt' : hoveredAtlasArea ? 'unter Cursor' : 'bereit'}
                </div>
                {/* Bruecke Funktion->Struktur: geklicktes Julich-Carve-Areal im praezisen fsaverage-Atlas
                    (echte Furchen) zeigen + hervorheben. Nur fuer Slugs mit zuordenbarem Areal (keine GapMaps). */}
                {pickedAtlasArea ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9, pointerEvents: 'auto' }}>
                    {julichBridgeFor(pickedAtlasSlug) ? (
                      <button
                        type="button"
                        className="ed-btn"
                        style={{ padding: '5px 11px' }}
                        onClick={() => {
                          const t = julichBridgeFor(pickedAtlasSlug)!
                          setAtlasFocus({ layer: t.layer, name: t.name })
                          setAppMode('atlas')
                        }}
                      >
                        Im Atlas zeigen →
                      </button>
                    ) : null}
                    {pickedAtlasArea ? (
                      <button
                        type="button"
                        className="ed-btn"
                        style={{ padding: '5px 11px' }}
                        onClick={() => setPickedAtlasArea(null, null)}
                      >
                        Areal lösen
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            </>
            )}
          </div>

          {renderInlineSidebar ? sidebar : null}
          {renderMobileTreeDrawer ? (
            <div
              className="ed-panel ed-frame"
              data-testid="mobile-structure-drawer"
              style={{
                position: 'absolute',
                left: 8,
                right: 8,
                top: 8,
                bottom: 8,
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1.5px solid var(--line)' }}>
                <span className="eyebrow">Strukturbaum</span>
                <button type="button" className="ed-btn" style={{ padding: '4px 9px' }} onClick={() => setMobileTreeOpen(false)}>
                  Schließen
                </button>
              </div>
              {sidebar}
            </div>
          ) : null}
        </div>

        {/* ── Steuer-Fussleiste: Atlas-Menue, Werkzeug (nur Explorer), Modus ── */}
        <FooterBar />
      </div>
    </div>
  )
}
