import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  useAuthoringSnapshotStore,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'
import { useViewerStore } from './viewerStore'
import {
  VIEWER_STATE_SNAPSHOT_VERSION,
  exportViewerStateSnapshot,
  hasImportedSnapshotRouteForCurrentLocation,
  importViewerStateSnapshot,
} from './viewerStateSnapshot'
import { registryLaunchLocation, resolveRegistryLaunch } from './registryLaunch'

describe('appMode', () => {
  beforeEach(() => {
    // Store auf modus-fremde Reststaende setzen, um den Reset zu pruefen.
    useViewerStore.setState({
      appMode: 'learn',
      highlight: ['x', 'y'],
      showSkull: true,
      rodVisible: true,
      rodPhase: 0.7,
    })
  })

  it('default ist learn', () => {
    useViewerStore.setState({ appMode: 'learn' })
    expect(useViewerStore.getState().appMode).toBe('learn')
  })

  it('setAppMode wechselt den Modus und raeumt modus-fremde States auf', () => {
    useViewerStore.getState().setAppMode('explore')
    const s = useViewerStore.getState()
    expect(s.appMode).toBe('explore')
    expect(s.highlight).toEqual([])
    expect(s.showSkull).toBe(false)
    expect(s.rodVisible).toBe(false)
    expect(s.rodPhase).toBe(0)
  })

  it('wirft laut bei unbekanntem Modus', () => {
    // @ts-expect-error absichtlich ungueltig
    expect(() => useViewerStore.getState().setAppMode('bogus')).toThrow(/appMode/)
  })
})

describe('phineas rod state', () => {
  it('klemmt den Rod-Fortschritt auf 0-1', () => {
    useViewerStore.getState().setRodPhase(1.4)
    expect(useViewerStore.getState().rodPhase).toBe(1)

    useViewerStore.getState().setRodPhase(-0.2)
    expect(useViewerStore.getState().rodPhase).toBe(0)
  })
})

describe('cameraView', () => {
  beforeEach(() => {
    useViewerStore.setState({ cameraView: null, highlight: [] })
  })

  it('erneuert den Trigger nur bei explizitem setCameraView', () => {
    useViewerStore.getState().setCameraView('lateral-left')
    const first = useViewerStore.getState().cameraView

    useViewerStore.getState().setHighlight(['left-insula'])
    expect(useViewerStore.getState().cameraView).toBe(first)

    useViewerStore.getState().setCameraView('lateral-left')
    expect(useViewerStore.getState().cameraView).toEqual({ name: 'lateral-left', nonce: 2 })
  })
})

describe('carveOverlay', () => {
  beforeEach(() => {
    useViewerStore.setState({
      cortexHideSlugs: ['left-cortex'],
      hidden: new Set(),
      hoveredAtlasArea: 'Hover',
      hoveredAtlasSlug: 'hover-slug',
      pickedAtlasArea: 'Pick',
      pickedAtlasSlug: 'pick-slug',
      showCarveBrodmann: false,
      showCarveDkt: false,
      showCarveJulich: false,
    })
  })

  it('aktiviert Carve-Atlanten exklusiv wie eine Radio-Gruppe', () => {
    useViewerStore.getState().setCarveOverlay('julich', true)
    expect(useViewerStore.getState().showCarveJulich).toBe(true)
    expect(useViewerStore.getState().showCarveDkt).toBe(false)
    expect(useViewerStore.getState().showCarveBrodmann).toBe(false)
    expect(useViewerStore.getState().hidden.has('left-cortex')).toBe(true)

    useViewerStore.getState().setCarveOverlay('dkt', true)
    expect(useViewerStore.getState().showCarveJulich).toBe(false)
    expect(useViewerStore.getState().showCarveDkt).toBe(true)
    expect(useViewerStore.getState().showCarveBrodmann).toBe(false)
  })

  it('normalisiert bestehende Mehrfachzustaende beim naechsten Aktivieren', () => {
    useViewerStore.setState({ showCarveJulich: true, showCarveDkt: true, showCarveBrodmann: false })

    useViewerStore.getState().setCarveOverlay('brodmann', true)

    expect(useViewerStore.getState().showCarveJulich).toBe(false)
    expect(useViewerStore.getState().showCarveDkt).toBe(false)
    expect(useViewerStore.getState().showCarveBrodmann).toBe(true)
  })

  it('raeumt Areal-Hover und Pick beim Umschalten auf', () => {
    useViewerStore.getState().setCarveOverlay('julich', true)

    expect(useViewerStore.getState().pickedAtlasArea).toBeNull()
    expect(useViewerStore.getState().pickedAtlasSlug).toBeNull()
    expect(useViewerStore.getState().hoveredAtlasArea).toBeNull()
    expect(useViewerStore.getState().hoveredAtlasSlug).toBeNull()
  })

  it('gibt Host-Cortex beim letzten Ausschalten wieder frei', () => {
    useViewerStore.getState().setCarveOverlay('julich', true)
    useViewerStore.getState().setCarveOverlay('julich', false)

    expect(useViewerStore.getState().showCarveJulich).toBe(false)
    expect(useViewerStore.getState().hidden.has('left-cortex')).toBe(false)
  })
})

describe('viewer state snapshots', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    hasImportedSnapshotRouteForCurrentLocation()
    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()
    useViewerStore.setState({
      appMode: 'explore',
      activePreset: null,
      cameraView: null,
      clipAtlasOverlay: true,
      colorMode: 'region',
      cutMode: 'slice',
      cuts: {
        sagittal: { on: false, pos: 0 },
        coronal: { on: false, pos: 0 },
        axial: { on: false, pos: 0 },
      },
      hidden: new Set(),
      highlight: [],
      isolated: null,
      isolatedSlugs: new Set(),
      isolationPath: [],
      lang: 'de',
      mode: 'full',
      pickedAtlasArea: null,
      pickedAtlasSlug: null,
      rodPhase: 0,
      rodVisible: false,
      selectMode: 'group',
      selected: null,
      selectedLabels: null,
      selectedSlugs: new Set(),
      showAtlasDkt: false,
      showAtlasJulich: false,
      showCarveBrodmann: false,
      showCarveDkt: false,
      showCarveJulich: false,
      showSkull: false,
      skullOpacity: 0.25,
    })
  })

  it('exportiert nur stabile, versionierte Unterrichts-State-Felder', () => {
    useViewerStore.setState({
      appMode: 'phineas',
      activePreset: {
        id: 'p3a',
        label: 'P3a',
        dimOthers: false,
        groups: [{ label: 'ACC', hue: 20, buckets: ['dacc'] }],
      },
      cameraView: { name: 'lateral-left', nonce: 7 },
      clipAtlasOverlay: false,
      colorMode: 'preset',
      cutMode: 'hide',
      cuts: {
        sagittal: { on: true, pos: 12 },
        coronal: { on: false, pos: 0 },
        axial: { on: true, pos: -18 },
      },
      hidden: new Set(['left-insula', 'right-insula']),
      highlight: ['left-cingulate-gyrus'],
      isolated: 'left-cingulate-gyrus',
      pickedAtlasArea: 'Area 44 (L)',
      pickedAtlasSlug: 'julich3-area-44-ifg-l',
      rodPhase: 0.4,
      rodVisible: true,
      selected: 'left-cingulate-gyrus',
      selectMode: 'direct',
      showCarveDkt: true,
      showSkull: true,
      skullOpacity: 0.5,
      cameraPose: {
        position: [10, 20, 30],
        target: [1, 2, 3],
        fov: 45,
      },
    })

    const snapshot = exportViewerStateSnapshot()

    expect(snapshot.version).toBe(VIEWER_STATE_SNAPSHOT_VERSION)
    expect(snapshot.state.hidden).toEqual(['left-insula', 'right-insula'])
    expect(snapshot.state.cameraView).toBe('lateral-left')
    expect(snapshot.state.cameraPose).toEqual({ position: [10, 20, 30], target: [1, 2, 3], fov: 45 })
    expect(snapshot.state.activePreset?.id).toBe('p3a')
    expect(JSON.stringify(snapshot)).not.toContain('hovered')
    expect(JSON.stringify(snapshot)).not.toContain('ontology')
  })

  it('exportiert und importiert den kanonischen Szenen-Link fuer Unterrichts-Snapshots', () => {
    window.history.replaceState(null, '', '/?config=vcpt&scene=vcpt&step=2')

    const snapshot = exportViewerStateSnapshot()

    expect(snapshot.state.route).toEqual({ configName: 'vcpt', sceneId: 'vcpt', step: 2 })

    window.history.replaceState(null, '', '/?mode=phineas')
    importViewerStateSnapshot(snapshot)

    expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=2')
  })

  it('erhaelt die first-class Presentation-Sequenz in Unterrichts-Snapshots', () => {
    window.history.replaceState(null, '', '/?sequence=presentation.kapitel11-vorlesung&config=vcpt&scene=vcpt&step=2')

    const snapshot = exportViewerStateSnapshot()

    expect(snapshot.state.route).toEqual({
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
      configName: 'vcpt',
      sceneId: 'vcpt',
      step: 2,
    })

    window.history.replaceState(null, '', '/?mode=phineas')
    importViewerStateSnapshot(snapshot)

    expect(window.location.search).toBe('?sequence=presentation.kapitel11-vorlesung&config=vcpt&scene=vcpt&step=2')
  })

  it('exportiert und importiert Registry-Launch-Kontext fuer Phineas', () => {
    const launch = resolveRegistryLaunch({
      collectionId: 'case-phineas-gage',
      contextId: 'phineas-gage',
    })
    window.history.replaceState(null, '', registryLaunchLocation(launch))
    useViewerStore.setState({ appMode: 'phineas' })

    const snapshot = exportViewerStateSnapshot()

    expect(snapshot.state.launch).toEqual(launch)

    window.history.replaceState(null, '', '/?config=vcpt')
    useViewerStore.setState({ appMode: 'explore' })
    importViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: { launch },
    })

    expect(window.location.search).toBe('?collectionId=case-phineas-gage&contextId=phineas-gage&entrypoint=mode%3Aphineas&mode=phineas')
    expect(useViewerStore.getState().appMode).toBe('phineas')
  })

  it('exportiert und importiert AuthoringScene-State fuer Objekt- und Timeline-Roundtrips', () => {
    const authoring: AuthoringSnapshotState = {
      schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
      registryContext: {
        collectionIds: ['device-eeg-10-20'],
        bonusContextIds: ['eeg-erp-vcpt'],
      },
      authoringScenes: [
        {
          schemaVersion: 1,
          sceneId: 'vcpt-device-authoring',
          assetInstances: [
            {
              instanceId: 'eeg-cap-01',
              assetId: 'asset:eeg-cap',
              collectionId: 'device-eeg-10-20',
              visible: true,
              transform: { position: [0, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
              origin: { policy: 'asset-origin' },
              parts: [{ partId: 'electrode-fz', label: 'Fz electrode', pickable: true, role: 'selectable' }],
            },
          ],
        },
      ],
      timelines: [
        {
          schemaVersion: 1,
          timelineId: 'vcpt-device-timeline',
          restore: { stepId: 'vcpt-device-step', keyframeId: 'fz-highlight' },
          steps: [
            {
              stepId: 'vcpt-device-step',
              order: 0,
              durationMs: 3000,
              keyframes: [{ keyframeId: 'fz-highlight', atMs: 0, channels: {} }],
            },
          ],
        },
      ],
      activeSceneId: 'vcpt-device-authoring',
      activeTargetRef: {
        targetKind: 'asset-part',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
        partId: 'electrode-fz',
      },
      activeTimeline: {
        timelineId: 'vcpt-device-timeline',
        stepId: 'vcpt-device-step',
        keyframeId: 'fz-highlight',
      },
      animationState: [
        { bindingId: 'fz-pulse', clipId: 'clip:fz-pulse', action: 'scrub', timeMs: 1200 },
      ],
    }
    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(authoring)

    const snapshot = exportViewerStateSnapshot()

    expect(snapshot.state.authoring).toEqual(authoring)

    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()
    importViewerStateSnapshot(snapshot)

    expect(useAuthoringSnapshotStore.getState().authoring).toEqual(authoring)
  })

  it('laesst Snapshot-Import gegen Config-Link-Defaults gewinnen', () => {
    window.history.replaceState(null, '', '/?config=vcpt&scene=vcpt&step=2')
    const snapshot = exportViewerStateSnapshot()

    window.history.replaceState(null, '', '/?config=p3a-konfliktmonitoring')
    expect(hasImportedSnapshotRouteForCurrentLocation()).toBe(false)

    importViewerStateSnapshot(snapshot)

    expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=2')
    expect(hasImportedSnapshotRouteForCurrentLocation()).toBe(true)

    window.history.replaceState(null, '', '/?config=p3a-konfliktmonitoring')
    expect(hasImportedSnapshotRouteForCurrentLocation()).toBe(false)
  })

  it('laesst explizite Snapshot-Felder gegen bestehenden Sitzungs-State gewinnen', () => {
    useViewerStore.setState({
      cutMode: 'hide',
      cuts: {
        sagittal: { on: false, pos: 0 },
        coronal: { on: false, pos: 0 },
        axial: { on: false, pos: 0 },
      },
      hidden: new Set(['local-only']),
      highlight: ['local-highlight'],
      showCarveJulich: true,
      showCarveDkt: false,
    })

    importViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        cutMode: 'slice',
        cuts: {
          sagittal: { on: true, pos: 12 },
          coronal: { on: false, pos: 0 },
          axial: { on: false, pos: 0 },
        },
        hidden: ['snapshot-hidden'],
        highlight: ['snapshot-highlight'],
        showCarveJulich: false,
        showCarveDkt: true,
      },
    })

    const state = useViewerStore.getState()
    expect(state.cutMode).toBe('slice')
    expect(state.cuts.sagittal).toEqual({ on: true, pos: 12 })
    expect([...state.hidden]).toEqual(['snapshot-hidden'])
    expect(state.highlight).toEqual(['snapshot-highlight'])
    expect(state.showCarveJulich).toBe(false)
    expect(state.showCarveDkt).toBe(true)
  })

  it('importiert einen Snapshot und normalisiert Sets, Cuts und geklemmte Werte', () => {
    importViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        appMode: 'phineas',
        cameraView: 'medial-midline',
        clipAtlasOverlay: false,
        colorMode: 'region',
        cutMode: 'hide',
        cuts: {
          sagittal: { on: true, pos: 220 },
          coronal: { on: false, pos: 0 },
          axial: { on: true, pos: -220 },
        },
        hidden: ['right-insula', 'left-insula'],
        highlight: ['left-cingulate-gyrus'],
        isolated: 'left-cingulate-gyrus',
        lang: 'en',
        mode: 'k11',
        pickedAtlasArea: 'Area 44 (L)',
        pickedAtlasSlug: 'julich3-area-44-ifg-l',
        cameraPose: {
          position: [10, 20, 30],
          target: [1, 2, 3],
          fov: 45,
        },
        rodPhase: 2,
        rodVisible: true,
        selectMode: 'direct',
        selected: 'left-cingulate-gyrus',
        showAtlasDkt: true,
        showAtlasJulich: false,
        showCarveBrodmann: false,
        showCarveDkt: true,
        showCarveJulich: false,
        showSkull: true,
        skullOpacity: 0.5,
      },
    })

    const state = useViewerStore.getState()
    expect(state.appMode).toBe('phineas')
    expect(state.cameraView).toEqual({ name: 'medial-midline', nonce: 1 })
    expect(state.cameraPose).toEqual({ position: [10, 20, 30], target: [1, 2, 3], fov: 45 })
    expect([...state.hidden].sort()).toEqual(['left-insula', 'right-insula'])
    expect(state.cuts.sagittal.pos).toBe(110)
    expect(state.cuts.axial.pos).toBe(-110)
    expect(state.rodPhase).toBe(1)
    expect(state.selected).toBe('left-cingulate-gyrus')
    expect(state.isolated).toBe('left-cingulate-gyrus')
    expect(state.showCarveDkt).toBe(true)
    expect(state.pickedAtlasSlug).toBe('julich3-area-44-ifg-l')
  })

  it('weist unbekannte Snapshot-Versionen laut zurueck', () => {
    expect(() => importViewerStateSnapshot({ version: 999, state: {} })).toThrow(/Snapshot-Version/)
  })

  it('weist ungueltige Kamera-Posen laut zurueck', () => {
    expect(() => importViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        cameraPose: {
          position: [0, 0, 0],
          target: [0, 0, 0],
          fov: 180,
        },
      },
    })).toThrow(/cameraPose\.fov/)
  })
})
