import { beforeEach, describe, expect, it } from 'vitest'
import { useViewerStore } from './viewerStore'

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
