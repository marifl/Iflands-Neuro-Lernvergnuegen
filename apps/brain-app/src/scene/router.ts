export interface SceneLocation {
  sceneId: string | null
  step: number
}

export function parseLocation(search: string): SceneLocation {
  const p = new URLSearchParams(search)
  const sceneId = p.get('scene')
  const step = Number(p.get('step') ?? '0')
  return { sceneId, step: Number.isFinite(step) ? step : 0 }
}

export function toQuery(sceneId: string, step: number): string {
  return `?scene=${sceneId}&step=${step}`
}
