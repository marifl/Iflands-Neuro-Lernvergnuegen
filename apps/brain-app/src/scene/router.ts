export interface SceneLocation {
  sceneId: string | null
  configName: string | null
  step: number
  sequenceKind?: SceneSequenceKind
  sequenceName?: string
}

export const ROUTE_CHANGE_EVENT = 'brain-app:urlchange'
export const SCENE_SEQUENCE_KINDS = ['learning', 'presentation'] as const
export type SceneSequenceKind = (typeof SCENE_SEQUENCE_KINDS)[number]

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
  const sequence = parseSequence(p.get('sequence'))
  return { ...sequence, sceneId, configName, step: parseStep(p.get('step')) }
}

export function toQuery(sceneId: string, step: number): string {
  return toCanonicalQuery({ sceneId, step })
}

export interface CanonicalQueryInput {
  sceneId?: string | null
  configName?: string | null
  step?: number
  sequenceKind?: SceneSequenceKind
  sequenceName?: string
}

function isSequenceKind(value: string): value is SceneSequenceKind {
  return (SCENE_SEQUENCE_KINDS as readonly string[]).includes(value)
}

function parseSequence(raw: string | null): Pick<SceneLocation, 'sequenceKind' | 'sequenceName'> {
  if (!raw) return {}
  const [kind, ...nameParts] = raw.split('.')
  const name = nameParts.join('.')
  if (!isSequenceKind(kind) || !name) return {}
  return { sequenceKind: kind, sequenceName: name }
}

function sequenceQueryValue(input: CanonicalQueryInput): string | null {
  if (input.sequenceKind === undefined && input.sequenceName === undefined) return null
  if (!input.sequenceKind || !input.sequenceName) {
    throw new Error('toCanonicalQuery: sequenceKind und sequenceName muessen gemeinsam gesetzt sein')
  }
  return `${input.sequenceKind}.${input.sequenceName}`
}

export function toCanonicalQuery(input: CanonicalQueryInput): string {
  if (!input.configName && !input.sceneId) throw new Error('toCanonicalQuery: sceneId oder configName erwartet')
  const p = new URLSearchParams()
  const sequence = sequenceQueryValue(input)
  if (sequence) p.set('sequence', sequence)
  if (input.configName) p.set('config', input.configName)
  if (input.sceneId) p.set('scene', input.sceneId)
  if (input.sceneId) {
    const step = input.step ?? 0
    if (!Number.isFinite(step)) throw new Error(`toCanonicalQuery: step "${step}" ist nicht endlich`)
    p.set('step', String(step))
  }
  return `?${p.toString()}`
}

export function toConfigQuery(configName: string): string {
  return toCanonicalQuery({ configName })
}

function preserveScopeOverrides(query: string, input: CanonicalQueryInput): string {
  const current = new URLSearchParams(window.location.search)
  if (!input.configName || current.get('config') !== input.configName) return query
  const scoped = new URLSearchParams(query)
  for (const key of ['on', 'off']) {
    const value = current.get(key)
    if (value) scoped.set(key, value)
  }
  return `?${scoped.toString()}`
}

export function replaceCanonicalLocation(input: CanonicalQueryInput): string {
  const query = preserveScopeOverrides(toCanonicalQuery(input), input)
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}
