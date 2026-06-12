import { useEffect } from 'react'
import BodyParts3DViewer from '../viewer/BodyParts3DViewer'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { loadScenes } from './scenes'
import { regionsToMeshes } from './brainBridge'
import { parseLocation } from './router'
import { nextIndex, prevIndex } from './nav'
import OverlayPanel from './overlays/OverlayPanel'
import { useIsNarrow } from '../useMediaQuery'

export default function SceneStage() {
  const isNarrow = useIsNarrow()
  const scenes = useSceneStore((s) => s.scenes)
  const index = useSceneStore((s) => s.index)
  const setScenes = useSceneStore((s) => s.setScenes)
  const goto = useSceneStore((s) => s.goto)
  const setCameraShot = useSceneStore((s) => s.setCameraShot)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setMode = useViewerStore((s) => s.setMode)

  // Szenen laden + Deep-Link-Startposition (C).
  useEffect(() => {
    loadScenes().then((all) => {
      setScenes(all)
      setMode('k11') // Kapitel-11-Fokus im Viewer
      const loc = parseLocation(window.location.search)
      const start = loc.sceneId ? all.findIndex((s) => s.id === loc.sceneId) : 0
      goto(start >= 0 ? start : 0, loc.step)
    })
  }, [setScenes, goto, setMode])

  // Aktive Szene -> Hirn-Highlight + Kamera-Shot spiegeln.
  const scene = scenes[index]
  useEffect(() => {
    if (!scene) return
    setHighlight(regionsToMeshes(scene.brain.regions))
    setCameraShot(scene.brain.camera)
  }, [scene, setHighlight, setCameraShot])

  // Tastatur-Nav (Praesentationsmodus): ←/→ blaettert Szenen, f = Vollbild.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { index, scenes, goto } = useSceneStore.getState()
      if (e.key === 'ArrowRight') goto(nextIndex(index, scenes.length))
      if (e.key === 'ArrowLeft') goto(prevIndex(index))
      if (e.key === 'f') document.documentElement.requestFullscreen?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // URL bei Szenenwechsel aktualisieren (Deep-Link teilbar).
  useEffect(() => {
    if (scene) window.history.replaceState(null, '', `?scene=${scene.id}`)
  }, [scene])

  // Editorial-Split: 3D als Cover, Szenen-Inhalt als feste Spalte rechts, Nav in der Kopfzeile.
  // Keine Overlays ueber dem 3D-Viewport — nichts ueberlagert die Haupt-UI.
  return (
    <BodyParts3DViewer
      presentation
      sidebar={
        scene ? (
          <OverlayPanel scene={scene} />
        ) : (
          <aside
            style={
              isNarrow
                ? { flex: '1 1 auto', width: '100%', borderTop: '1.5px solid var(--line)' }
                : { flex: 'none', width: 460, borderLeft: '1.5px solid var(--line)' }
            }
          />
        )
      }
    />
  )
}
