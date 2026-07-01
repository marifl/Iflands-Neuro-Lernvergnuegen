import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSceneStore } from '../scene/sceneStore'
import type { LoadedScene } from '../scene/scenes'
import {
  learnLocationFromSceneStore,
  navigateSurface,
  navigateToAtlasSearch,
  navigateToExploreSearch,
  navigateToLearnSearch,
  openAtlasSupplement,
} from './surfaceNavigation'
import { useViewerStore } from './viewerStore'
import { explicitAppModeFromSearch } from './settingsRuntime'

function learningScene(configName = 'vcpt', id = 'vcpt'): LoadedScene {
  return {
    id,
    configName,
    configCameraTargetMeshes: [],
    sequence: { kind: 'learning', name: 'kapitel11-pfad', label: 'Lernpfad', stepIndex: 0, stepCount: 1 },
    title: 'Test',
    section: 'S',
    companion: { summary: '', sources: [] },
    brain: { regions: [] },
    overlay: { kind: 'prose', size: 'md' },
  } as unknown as LoadedScene
}

describe('surfaceNavigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    useSceneStore.setState({ scenes: [], index: 0, step: 0 })
    useViewerStore.setState({ appMode: 'learn', atlasFocus: null })
  })

  it('navigateToExploreSearch setzt ?mode=explore', () => {
    expect(navigateToExploreSearch()).toBe('?mode=explore')
    expect(window.location.search).toBe('?mode=explore')
    expect(explicitAppModeFromSearch(window.location.search)).toBe('explore')
  })

  it('navigateToAtlasSearch setzt ?mode=atlas', () => {
    expect(navigateToAtlasSearch()).toBe('?mode=atlas')
    expect(explicitAppModeFromSearch(window.location.search)).toBe('atlas')
  })

  it('navigateToLearnSearch nutzt Scene-Store fuer kanonische Learn-URL', () => {
    useSceneStore.setState({
      scenes: [learningScene()],
      index: 0,
      step: 2,
    })
    expect(navigateToLearnSearch()).toBe('?sequence=learning.kapitel11-pfad&config=vcpt&scene=vcpt&step=2')
    expect(explicitAppModeFromSearch(window.location.search)).toBe('learn')
  })

  it('navigateSurface learn stellt URL nach explore-Wechsel wieder her', () => {
    useSceneStore.setState({ scenes: [learningScene()], index: 0, step: 1 })
    navigateToExploreSearch()
    const setAppMode = vi.fn()
    navigateSurface('learn', setAppMode)
    expect(window.location.search).toBe('?sequence=learning.kapitel11-pfad&config=vcpt&scene=vcpt&step=1')
    expect(setAppMode).toHaveBeenCalledWith('learn')
  })

  it('openAtlasSupplement setzt Fokus, Modus und URL', () => {
    openAtlasSupplement({ layer: 'dkt', name: 'superiorfrontal' })
    expect(useViewerStore.getState().appMode).toBe('atlas')
    expect(useViewerStore.getState().atlasFocus).toEqual({ layer: 'dkt', name: 'superiorfrontal' })
    expect(window.location.search).toBe('?mode=atlas')
    expect(explicitAppModeFromSearch(window.location.search)).toBe('atlas')
  })

  it('learnLocationFromSceneStore ignoriert Vortragssequenz', () => {
    useSceneStore.setState({
      scenes: [{
        ...learningScene(),
        sequence: { kind: 'presentation', name: 'kapitel11-vorlesung', label: 'Vortrag', stepIndex: 0, stepCount: 1 },
      }],
      index: 0,
      step: 0,
    })
    expect(learnLocationFromSceneStore()).toBeNull()
  })
})
