import { useEffect } from 'react'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { loadScenes } from './scenes'
import { regionsToMeshes } from './brainBridge'
import { parseLocation } from './router'
import { nextIndex, prevIndex } from './nav'
import OverlayPanel from './overlays/OverlayPanel'
import { useIsNarrow } from '../useMediaQuery'

/** Sidebar-Inhalt des Lern-Modus: laedt + spiegelt Szenen (Highlight, Kamera, URL) und
 *  rendert den Szenen-Inhalt. Mountet nur im learn-Modus -> Szenen werden sonst nicht geladen. */
export default function LearnSidebar() {
  const isNarrow = useIsNarrow()
  const scenes = useSceneStore((s) => s.scenes)
  const index = useSceneStore((s) => s.index)
  const setScenes = useSceneStore((s) => s.setScenes)
  const goto = useSceneStore((s) => s.goto)
  const setCameraShot = useSceneStore((s) => s.setCameraShot)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setMode = useViewerStore((s) => s.setMode)

  useEffect(() => {
    loadScenes().then((all) => {
      setScenes(all)
      setMode('k11')
      const loc = parseLocation(window.location.search)
      const start = loc.sceneId ? all.findIndex((s) => s.id === loc.sceneId) : 0
      goto(start >= 0 ? start : 0, loc.step)
    })
  }, [setScenes, goto, setMode])

  const scene = scenes[index]
  useEffect(() => {
    if (!scene) return
    setHighlight(regionsToMeshes(scene.brain.regions))
    setCameraShot(scene.brain.camera)
  }, [scene, setHighlight, setCameraShot])

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
    if (scene) window.history.replaceState(null, '', `?scene=${scene.id}`)
  }, [scene])

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
