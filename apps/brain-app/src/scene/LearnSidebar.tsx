import { useEffect, useRef, useState } from 'react'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { loadScenes, sceneIndexForLocation } from './scenes'
import { regionsToMeshes } from './brainBridge'
import { ROUTE_CHANGE_EVENT, parseLocation, replaceCanonicalLocation, type CanonicalQueryInput } from './router'
import { nextIndex, prevIndex } from './nav'
import OverlayPanel from './overlays/OverlayPanel'
import { useIsNarrow } from '../useMediaQuery'

/** Sidebar-Inhalt des Lern-Modus: laedt + spiegelt Szenen (Highlight, Kamera, URL) und
 *  rendert den Szenen-Inhalt. Mountet nur im learn-Modus -> Szenen werden sonst nicht geladen. */
export default function LearnSidebar() {
  const [loadError, setLoadError] = useState<Error | null>(null)
  const isNarrow = useIsNarrow()
  const scenes = useSceneStore((s) => s.scenes)
  const index = useSceneStore((s) => s.index)
  const step = useSceneStore((s) => s.step)
  const setScenes = useSceneStore((s) => s.setScenes)
  const goto = useSceneStore((s) => s.goto)
  const setCameraShot = useSceneStore((s) => s.setCameraShot)
  const setCameraConfig = useSceneStore((s) => s.setCameraConfig)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setMode = useViewerStore((s) => s.setMode)
  const routeSequenceRef = useRef<Pick<CanonicalQueryInput, 'sequenceKind' | 'sequenceName'> | null>(null)

  useEffect(() => {
    const loc = parseLocation(window.location.search)
    routeSequenceRef.current = loc.sequenceKind && loc.sequenceName
      ? { sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName }
      : null
    loadScenes({ sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName })
      .then((all) => {
        setScenes(all)
        setMode('k11')
        const start = sceneIndexForLocation(all, loc)
        goto(start >= 0 ? start : 0, loc.step)
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error : new Error(String(error))))
  }, [setScenes, goto, setMode])

  useEffect(() => {
    const syncFromRoute = () => {
      const loc = parseLocation(window.location.search)
      const state = useSceneStore.getState()
      if (!state.scenes.length) return
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
        isNarrow
          ? { flex: '1 1 auto', width: '100%', borderTop: '1.5px solid var(--line)' }
          : { flex: 'none', width: 460, borderLeft: '1.5px solid var(--line)' }
      }
    />
  )
}
