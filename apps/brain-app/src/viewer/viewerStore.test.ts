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
  })

  it('wirft laut bei unbekanntem Modus', () => {
    // @ts-expect-error absichtlich ungueltig
    expect(() => useViewerStore.getState().setAppMode('bogus')).toThrow(/appMode/)
  })
})
