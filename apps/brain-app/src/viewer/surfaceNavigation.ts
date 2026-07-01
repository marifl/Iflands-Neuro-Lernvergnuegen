import { useSceneStore } from '../scene/sceneStore'
import { parseLocation, replaceCanonicalLocation, ROUTE_CHANGE_EVENT, type CanonicalQueryInput } from '../scene/router'
import { useViewerStore, type AppMode } from './viewerStore'

/** Aktuelle Learn-Szene aus dem Scene-Store (nur Lernsequenz, nicht Vortrag). */
export function learnLocationFromSceneStore(): CanonicalQueryInput | null {
  const { scenes, index, step } = useSceneStore.getState()
  const scene = scenes[index]
  if (!scene || scene.sequence.kind === 'presentation') return null
  return {
    sequenceKind: scene.sequence.kind,
    sequenceName: scene.sequence.name,
    configName: scene.configName,
    sceneId: scene.id,
    step,
  }
}

function replaceModeOnlySearch(mode: AppMode): string {
  const query = `?mode=${mode}`
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}

/** Learn-URL fuer Reload/Deep-Link: Scene-Store > parseLocation > ?mode=learn */
export function navigateToLearnSearch(): string {
  const fromStore = learnLocationFromSceneStore()
  if (fromStore) return replaceCanonicalLocation(fromStore)

  const loc = parseLocation(window.location.search)
  if (loc.sceneId || loc.configName) {
    return replaceCanonicalLocation({
      ...(loc.sequenceKind && loc.sequenceName
        ? { sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName }
        : {}),
      configName: loc.configName,
      sceneId: loc.sceneId,
      step: loc.step,
    })
  }

  return replaceModeOnlySearch('learn')
}

export function navigateToExploreSearch(): string {
  return replaceModeOnlySearch('explore')
}

export function navigateToAtlasSearch(): string {
  return replaceModeOnlySearch('atlas')
}

/** Surface-Wechsel: URL synchron halten, dann appMode setzen. */
export function navigateSurface(mode: AppMode, setAppMode: (m: AppMode) => void): void {
  if (mode === 'learn') navigateToLearnSearch()
  else if (mode === 'explore') navigateToExploreSearch()
  else navigateToAtlasSearch()
  setAppMode(mode)
}

/** Atlas-Supplement oeffnen (Funktion->Struktur-Bruecke): Fokus + URL + Modus. */
export function openAtlasSupplement(focus: { layer: string; name: string }): void {
  const { setAtlasFocus, setAppMode } = useViewerStore.getState()
  setAtlasFocus(focus)
  navigateToAtlasSearch()
  setAppMode('atlas')
}
