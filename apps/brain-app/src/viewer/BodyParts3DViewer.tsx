import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as THREE from 'three'
import { buildContextTree, flattenStructures, type Ontology, type OntologyNode } from './ontology'
import { useViewerStore } from './viewerStore'
import { useEffectiveConfig } from './atlas/atlasConfig'
import { buildAliasMapByCarveSlug, loadCatalog, type AtlasCatalog } from './atlas/atlasCatalog'
import StructureTree from './StructureTree'
import FooterBar from './FooterBar'
import ColorLegend from './ColorLegend'
import IsolationBar from './IsolationBar'
import ExplorerLearningFlyout, { learningTargetForNode, type ExplorerLearningTarget } from './ExplorerLearningFlyout'
import {
  responsiveShellMode,
  shellFlexDirection,
  shouldRenderInlineSidebar,
  shouldRenderMobileTreeDrawer,
  sidePanelBorder,
  viewportFlex,
} from './explorerShellLayout'
import PhineasSidebar from './PhineasSidebar'
import LearnSidebar from '../scene/LearnSidebar'
import ShellNav from './ShellNav'
import { ShellControlButton } from './ShellStatePrimitives'
import { CanvasContentErrorBoundary, CanvasStateHtml } from './CanvasViewportState'
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
import { shouldShowLauncher } from './settingsRuntime'
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
import ResumeLauncher from './ResumeLauncher'
import { replaceAppModeQuery } from '../scene/router'
import { bridgeFor, julichBridgeFor } from './atlas/atlasBridge'
import CutCaps from './CutCaps'
import CutPickBridge from './CutPickBridge'
import CutPlaneGizmoBridge from './CutPlaneGizmoBridge'
import { useIsNarrow, useIsTouchLandscape, useMediaQuery } from '../useMediaQuery'
import { useCaseStudyViewStore } from './phineasGage'
import {
  authoringHistoryActionForKeyboardEvent,
  isEditableKeyboardTarget,
} from './authoringKeyboardShortcuts'
import {
  BRAIN_MODEL_OPTIONS,
  DEFAULT_BRAIN_MODEL_OPTION,
  brainModelReviewSearch,
  resolveBrainModelOptionFromSearch,
  type BrainModelOptionId,
} from './brainModelOptions'
import { Brain, ContextSkull, ContextHead, AtlasOverObject, BrainModelReviewSelector, ATLAS3D, type Atlas3dKey, SKULL_GLB, HEAD_GLB } from './viewerSceneObjects'
import ConfigLinkStateApplier, { dimOpacityFromConfig } from './ConfigLinkStateApplier'
import { useDefaultsOnLaunch } from './useDefaultsOnLaunch'

const ONTOLOGY_URL = '/assets/bodyparts3d/ontology.json'

function dprForRenderQuality(renderQuality: RenderQuality): number | [number, number] {
  if (renderQuality === 'battery') return 1
  if (renderQuality === 'quality') return [1, 2]
  return [1, 1.5]
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
  const autoRotate = useSettingsStore((s) => s.viewport.autoRotate)
  const renderQuality = useSettingsStore((s) => s.viewport.renderQuality)
  const settingsDimOpacity = useSettingsStore((s) => s.coloring.dimOpacity)
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
  const [launched, setLaunched] = useState(() => !shouldShowLauncher(window.location.search, loadSettings()))
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  // Kontextspalte (Lern-/Struktur-/Fall-Panel inkl. ERP-Kurve) einklappbar wie im AtlasErp/AppFrame-Mockup.
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [brainModel, setBrainModel] = useState(() => resolveBrainModelOptionFromSearch(window.location.search))
  const [brainModelReviewActive, setBrainModelReviewActive] = useState(() => (
    new URLSearchParams(window.location.search).has('brainModel')
  ))

  const selectBrainModel = (optionId: BrainModelOptionId) => {
    const option = BRAIN_MODEL_OPTIONS.find((candidate) => candidate.id === optionId)
    if (!option) throw new Error(`Brain model "${optionId}" ist nicht registriert`)
    const nextSearch = brainModelReviewSearch(optionId, window.location.search)
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`
    window.history.replaceState(null, '', nextUrl)
    setBrainModel(option)
    setBrainModelReviewActive(optionId !== DEFAULT_BRAIN_MODEL_OPTION.id)
  }

  useEffect(() => {
    applyAppearanceSettings({
      display: { theme: themePreference, contrast, fontSize },
      accessibility: { quietMode, motion: motionPreference, focusRings, readableFont },
    }, document.documentElement, { prefersLight, prefersReducedMotion })
  }, [contrast, focusRings, fontSize, motionPreference, prefersLight, prefersReducedMotion, quietMode, readableFont, themePreference])

  useEffect(() => {
    if (shellMode !== 'portrait-drawer' || appMode !== 'explore') setMobileTreeOpen(false)
  }, [shellMode, appMode])

  useDefaultsOnLaunch(launched)

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
  const caseStudyActive = useCaseStudyViewStore((s) => s.showSkull || s.rodVisible)
  const sidebar =
    appMode === 'learn' ? <LearnSidebar /> : caseStudyActive ? <PhineasSidebar /> : <StructureTree />
  const renderInlineSidebar = shouldRenderInlineSidebar({ appMode, isAtlas, shellMode, caseStudyActive })
  // Einklappbar nur als echte Seitenspalte (Split/Landscape-Rail) — der Portrait-Drawer klappt anders.
  const panelCollapsible = renderInlineSidebar && shellMode !== 'portrait-drawer'
  const panelHidden = panelCollapsible && panelCollapsed
  // Collapse zuruecksetzen, sobald keine einklappbare Seitenspalte mehr aktiv ist (Atlas/Portrait),
  // damit das Panel beim Rueckwechsel nicht unsichtbar „klemmt".
  useEffect(() => {
    if (!panelCollapsible) setPanelCollapsed(false)
  }, [panelCollapsible])
  const renderMobileTreeDrawer = shouldRenderMobileTreeDrawer({ appMode, isAtlas, shellMode, mobileTreeOpen, caseStudyActive })
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
        <ResumeLauncher
          onEnter={(m) => {
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
                className="mono-base"
                style={{
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
          {/* Globale Surface-Navigation: Rail links bei Split/Landscape (Dock liegt portrait unten). */}
          {shellMode !== 'portrait-drawer' ? <ShellNav shellMode={shellMode} /> : null}
          <div
            style={{
              // Portrait: feste Hoehen-Zone oben; Split/Rail: nimmt den Restraum links.
              // Atlas-Modus hat keine Sidebar -> Viewport nimmt die volle Breite/Hoehe.
              flex: viewportFlex({ appMode, isAtlas, shellMode, caseStudyActive }),
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
              <CanvasContentErrorBoundary resetKey={brainModel.id}>
                <Suspense
                  fallback={(
                    <CanvasStateHtml
                      state="loading"
                      title="3D-Hirn wird geladen"
                      detail="BrainModel und Atlas-Layer werden vorbereitet."
                    />
                  )}
                >
                  <Brain brainModel={brainModel} dimOpacity={dimOpacity} />
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
              </CanvasContentErrorBoundary>
              <CutPickBridge />
              <OrbitControls makeDefault enableDamping autoRotate={autoRotate && !reduceMotion} autoRotateSpeed={0.35} />
              <CutPlaneGizmoBridge />
              <CameraRig />
              {perfGate ? <PerformanceGateProbe /> : null}
            </Canvas>
            <AuthoringTransformControls layout="toolbar" includeEditToggle includeNudgeAction includeResetAction />
            {brainModelReviewActive ? (
              <BrainModelReviewSelector brainModel={brainModel} isNarrow={isNarrow} onSelect={selectBrainModel} />
            ) : null}

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
                <div className="display-xl" style={{ letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 5, lineHeight: 1.15 }}>
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
                      replaceAppModeQuery('atlas')
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
                  replaceAppModeQuery('atlas')
                  setAppMode('atlas')
                }}
                onOpenTarget={openExplorerTarget}
              />
            ) : null}

            {/* Floating-Legende nur im Strukturfokus: im Lernschritt bleibt die Buehne frei,
                die Farberklaerung liegt im Lern-OverlayPanel statt ueber der Anatomie. */}
            {isExploreMode ? <ColorLegend /> : null}
            {/* Atlas-auf-Hirn aktiv: geklicktes Areal benennen (oben rechts, kollidiert nicht mit der
                Struktur-HUD links). Carve liegt 0 mm auf TARO -> Klick trifft das echte Areal. */}
            {atlasOnBrain && (
              <div
                className="ed-panel ed-frame"
                style={{ position: 'absolute', top: 16, right: 16, padding: '9px 14px', pointerEvents: 'none', maxWidth: 280 }}
              >
                <div className="eyebrow">Atlas-Areal{showCarveDkt ? ' · DKT' : showCarveJulich ? ' · Julich' : showCarveBrodmann ? ' · Brodmann' : ''}</div>
                <div className="mono-md" style={{ fontWeight: 600, color: pickedAtlasArea ? 'var(--orange)' : hoveredAtlasArea ? 'var(--ink)' : 'var(--g600)', marginTop: 4 }}>
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
                          replaceAppModeQuery('atlas')
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

          {/* Einklapp-Streifen zwischen Buehne und Kontextspalte (collapse →) bzw. Reopen-Tab (← ausklappen). */}
          {panelCollapsible ? (
            <button
              type="button"
              className="ed-btn"
              aria-label={panelCollapsed ? 'Kontextspalte einblenden' : 'Kontextspalte einklappen'}
              aria-expanded={!panelCollapsed}
              onClick={() => setPanelCollapsed((collapsed) => !collapsed)}
              style={{
                flex: 'none',
                width: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: 0,
                ...sidePanelBorder({ shellMode }),
              }}
            >
              {panelCollapsed ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            </button>
          ) : null}
          {renderInlineSidebar && !panelHidden ? sidebar : null}
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

        {/* Portrait: horizontales Dock (4 Surfaces + Mehr) als globale Navigation unter der Buehne. */}
        {shellMode === 'portrait-drawer' ? <ShellNav shellMode={shellMode} /> : null}

        {/* ── Steuer-Fussleiste (Werkzeug-Cockpit): nur Desktop/Landscape; auf Portrait liegen die
            Werkzeuge im Dock-„Mehr"-Sheet (sonst zwei Bottom-Leisten). ── */}
        {shellMode !== 'portrait-drawer' ? <FooterBar /> : null}
      </div>
    </div>
  )
}
