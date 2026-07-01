import { useEffect, useRef, useState } from 'react'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { loadScenes, sceneIndexForLocation } from './scenes'
import { regionsToMeshes } from './brainBridge'
import { ROUTE_CHANGE_EVENT, parseLocation, replaceCanonicalLocation, type CanonicalQueryInput } from './router'
import { nextIndex, prevIndex } from './nav'
import OverlayPanel from './overlays/OverlayPanel'
import { useIsNarrow, useIsTouchLandscape } from '../useMediaQuery'
import { responsiveShellMode, sidePanelBorder, sidePanelFlex, sidePanelWidth } from '../viewer/explorerShellLayout'
import { useSettingsStore } from '../viewer/settingsStore'
import {
  createStudentProgressState,
  markStudentStepSeen,
  useStudentProgressStore,
  type StudentProgressStepSource,
} from '../viewer/studentProgress'

/** Sidebar-Inhalt des Lern-Modus: laedt + spiegelt Szenen (Highlight, Kamera, URL) und
 *  rendert den Szenen-Inhalt. Mountet nur im learn-Modus -> Szenen werden sonst nicht geladen. */
export default function LearnSidebar() {
  const [loadError, setLoadError] = useState<Error | null>(null)
  const isNarrow = useIsNarrow()
  const isTouchLandscape = useIsTouchLandscape()
  const shellMode = responsiveShellMode({ isNarrow, isTouchLandscape })
  const scenes = useSceneStore((s) => s.scenes)
  const index = useSceneStore((s) => s.index)
  const step = useSceneStore((s) => s.step)
  const setScenes = useSceneStore((s) => s.setScenes)
  const goto = useSceneStore((s) => s.goto)
  const setCameraShot = useSceneStore((s) => s.setCameraShot)
  const setCameraConfig = useSceneStore((s) => s.setCameraConfig)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setMode = useViewerStore((s) => s.setMode)
  const saveProgress = useSettingsStore((s) => s.learning.saveProgress)
  const routeSequenceRef = useRef<Pick<CanonicalQueryInput, 'sequenceKind' | 'sequenceName'> | null>(null)
  // Generationszaehler: bei schnellem Sequence-Toggle (Vortrag an/aus) gewinnt nur der juengste
  // loadScenes-Aufruf; ueberholte Promises verwerfen ihr Ergebnis (kein stale-scene-Zustand).
  const loadGenRef = useRef(0)

  useEffect(() => {
    const loc = parseLocation(window.location.search)
    const generation = ++loadGenRef.current
    routeSequenceRef.current = loc.sequenceKind && loc.sequenceName
      ? { sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName }
      : null
    loadScenes({ sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName })
      .then((all) => {
        if (loadGenRef.current !== generation) return
        setScenes(all)
        setMode('k11')
        const start = sceneIndexForLocation(all, loc)
        goto(start >= 0 ? start : 0, loc.step)
      })
      .catch((error: unknown) => {
        if (loadGenRef.current !== generation) return
        setLoadError(error instanceof Error ? error : new Error(String(error)))
      })
  }, [setScenes, goto, setMode])

  useEffect(() => {
    const syncFromRoute = () => {
      const loc = parseLocation(window.location.search)
      const state = useSceneStore.getState()
      const locSequenceName = loc.sequenceKind && loc.sequenceName ? `${loc.sequenceKind}.${loc.sequenceName}` : null
      const curSequenceName = routeSequenceRef.current
        ? `${routeSequenceRef.current.sequenceKind}.${routeSequenceRef.current.sequenceName}`
        : null
      // Sequence-Wechsel (z. B. Lernpfad -> Vortrag) laedt die Szenen neu, statt nur zu springen.
      if (locSequenceName !== curSequenceName) {
        const generation = ++loadGenRef.current
        routeSequenceRef.current = loc.sequenceKind && loc.sequenceName
          ? { sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName }
          : null
        loadScenes({ sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName })
          .then((all) => {
            if (loadGenRef.current !== generation) return
            setScenes(all)
            const start = sceneIndexForLocation(all, loc)
            useSceneStore.getState().goto(start >= 0 ? start : 0, loc.step)
          })
          .catch((error: unknown) => {
            if (loadGenRef.current !== generation) return
            setLoadError(error instanceof Error ? error : new Error(String(error)))
          })
        return
      }
      if (!state.scenes.length) return
      // Surface-Wechsel setzt nur ?mode=explore|atlas — ohne scene/config/sequence nicht
      // auf Index 0 zurueckspringen (LearnSidebar bleibt kurz gemountet bis appMode wechselt).
      const params = new URLSearchParams(window.location.search)
      if (params.get('mode') && !loc.configName && !loc.sceneId && !loc.sequenceKind) return
      try {
        const next = sceneIndexForLocation(state.scenes, loc)
        const nextIndex = next >= 0 ? next : 0
        if (state.index !== nextIndex || state.step !== loc.step) {
          state.goto(nextIndex, loc.step)
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error : new Error(String(error)))
      }
    }
    window.addEventListener(ROUTE_CHANGE_EVENT, syncFromRoute)
    window.addEventListener('popstate', syncFromRoute)
    return () => {
      window.removeEventListener(ROUTE_CHANGE_EVENT, syncFromRoute)
      window.removeEventListener('popstate', syncFromRoute)
    }
  }, [])

  const scene = scenes[index]
  useEffect(() => {
    if (!scene) return
    setHighlight(regionsToMeshes(scene.brain.regions))
    setCameraShot(scene.brain.camera)
    setCameraConfig(scene.configCamera ?? null)
  }, [scene, setHighlight, setCameraShot, setCameraConfig])

  useEffect(() => {
    if (!scene || !saveProgress || scene.sequence.kind !== 'learning') return
    const sources: StudentProgressStepSource[] = scenes.map((loaded) => ({
      configName: loaded.configName,
      sceneId: loaded.id,
      title: loaded.title,
      ...(loaded.figure === undefined ? {} : { figure: loaded.figure }),
    }))
    const progressStore = useStudentProgressStore.getState()
    const current = progressStore.progress?.sequenceName === scene.sequence.name
      ? progressStore.progress
      : createStudentProgressState(scene.sequence.name, sources)
    progressStore.setStudentProgress(markStudentStepSeen(current, scene.configName, new Date().toISOString()))
  }, [scene, scenes, saveProgress])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const { index, scenes, goto } = useSceneStore.getState()
      if (e.key === 'ArrowRight') goto(nextIndex(index, scenes.length))
      if (e.key === 'ArrowLeft') goto(prevIndex(index))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (scene) replaceCanonicalLocation({ ...(routeSequenceRef.current ?? {}), configName: scene.configName, sceneId: scene.id, step })
  }, [scene, step])

  if (loadError) throw loadError
  if (scene) return <OverlayPanel scene={scene} />
  return (
    <aside
      style={
        {
          flex: sidePanelFlex(shellMode),
          width: sidePanelWidth({ shellMode, desktopWidth: 460 }),
          ...sidePanelBorder({ shellMode }),
        }
      }
    />
  )
}
