export interface SceneLocation {
  sceneId: string | null
  configName: string | null
  step: number
}

export const ROUTE_CHANGE_EVENT = 'brain-app:urlchange'

function parseStep(raw: string | null): number {
  if (raw === null) return 0
  if (!/^\d+$/.test(raw)) return 0
  const step = Number(raw)
  return Number.isSafeInteger(step) ? step : 0
}

export function parseLocation(search: string): SceneLocation {
  const p = new URLSearchParams(search)
  const sceneId = p.get('scene')
  const configName = p.get('config')
  return { sceneId, configName, step: parseStep(p.get('step')) }
}

export function toQuery(sceneId: string, step: number): string {
  return toCanonicalQuery({ sceneId, step })
}

export interface CanonicalQueryInput {
  sceneId?: string | null
  configName?: string | null
  step?: number
}

export function toCanonicalQuery(input: CanonicalQueryInput): string {
  const p = new URLSearchParams()
  if (input.configName) p.set('config', input.configName)
  if (input.sceneId) p.set('scene', input.sceneId)
  if (input.sceneId) {
    const step = input.step ?? 0
    if (!Number.isFinite(step)) throw new Error(`toCanonicalQuery: step "${step}" ist nicht endlich`)
    p.set('step', String(step))
  }
  if (p.size === 0) throw new Error('toCanonicalQuery: sceneId oder configName erwartet')
  return `?${p.toString()}`
}

export function toConfigQuery(configName: string): string {
  return toCanonicalQuery({ configName })
}

export function replaceCanonicalLocation(input: CanonicalQueryInput): string {
  const query = toCanonicalQuery(input)
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}
