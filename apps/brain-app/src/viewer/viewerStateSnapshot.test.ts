import { describe, expect, it } from 'vitest'
import {
  VIEWER_STATE_SNAPSHOT_VERSION,
  parseViewerStateSnapshot,
} from './viewerStateSnapshot'
import { useViewerStore } from './viewerStore'

describe('viewerStateSnapshot', () => {
  it('nutzt stabile Schema-Defaults statt aktuellen Live-State fuer fehlende Snapshot-Felder', () => {
    useViewerStore.setState({
      appMode: 'explore',
      colorMode: 'function',
      cutMode: 'hide',
      lang: 'en',
      mode: 'k11',
      selectMode: 'direct',
      showAtlasDkt: true,
      showAtlasJulich: true,
      showCarveBrodmann: true,
      showCarveDkt: true,
      showCarveJulich: true,
      clipAtlasOverlay: false,
    })

    const snapshot = parseViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {},
    })

    expect(snapshot.state.appMode).toBe('explore')
    expect(snapshot.state.colorMode).toBe('region')
    expect(snapshot.state.cutMode).toBe('slice')
    expect(snapshot.state.lang).toBe('de')
    expect(snapshot.state.mode).toBe('full')
    expect(snapshot.state.rodPhase).toBe(0)
    expect(snapshot.state.rodVisible).toBe(false)
    expect(snapshot.state.selectMode).toBe('group')
    expect(snapshot.state.showAtlasDkt).toBe(false)
    expect(snapshot.state.showAtlasJulich).toBe(false)
    expect(snapshot.state.showCarveBrodmann).toBe(false)
    expect(snapshot.state.showCarveDkt).toBe(false)
    expect(snapshot.state.showCarveJulich).toBe(false)
    expect(snapshot.state.showSkull).toBe(false)
    expect(snapshot.state.skullOpacity).toBe(0.25)
    expect(snapshot.state.clipAtlasOverlay).toBe(true)
  })

  it('weist ungueltige Snapshot-Werte weiterhin mit Feldkontext zurueck', () => {
    expect(() => parseViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        showSkull: 'ja',
      },
    })).toThrow(/showSkull/)
  })
})
