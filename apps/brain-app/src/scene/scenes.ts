import { SceneSchema, type Scene } from './types'

const SCENE_IDS = [
  'go-nogo-intro', 'vcpt', 'ica-uebersicht',
  'p3a-konfliktmonitoring', 'p3b-engagement', 'p3z-inhibition',
  'zusammenfassung',
] as const

/** Laedt + validiert alle Szenen aus public/scenes/, sortiert nach order.
 *  Wirft laut, wenn eine Datei fehlt oder das Schema verletzt (kein stiller Fallback). */
export async function loadScenes(): Promise<Scene[]> {
  const scenes = await Promise.all(
    SCENE_IDS.map(async (id) => {
      const res = await fetch(`/scenes/${id}.json`)
      if (!res.ok) throw new Error(`scenes: ${id}.json nicht ladbar (HTTP ${res.status})`)
      return SceneSchema.parse(await res.json())
    }),
  )
  return scenes.sort((a, b) => a.order - b.order)
}
