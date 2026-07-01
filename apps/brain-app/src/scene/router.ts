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

/** Surface-Modus in der URL (Reload-sicher). Lernen nutzt config/scene — kein mode=learn.
 *  Bestehende Query-Params (preset, off/on, …) bleiben erhalten; Atlas-Fokus optional serialisiert. */
export interface AppModeQueryOptions {
  atlasFocus?: { layer: string; name: string }
}

export function parseAtlasFocusFromSearch(search: string): { layer: string; name: string } | null {
  const params = new URLSearchParams(search)
  if (params.get('mode') !== 'atlas') return null
  const layer = params.get('atlasLayer')
  const name = params.get('atlasArea')
  if (!layer || !name) return null
  return { layer, name }
}

export function replaceAppModeQuery(mode: 'explore' | 'atlas', options?: AppModeQueryOptions): string {
  const params = new URLSearchParams(window.location.search)
  params.set('mode', mode)
  if (options?.atlasFocus) {
    params.set('atlasLayer', options.atlasFocus.layer)
    params.set('atlasArea', options.atlasFocus.name)
  } else if (mode !== 'atlas') {
    params.delete('atlasLayer')
    params.delete('atlasArea')
  }
  const query = params.toString() ? `?${params.toString()}` : window.location.pathname
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}

export function navigateToAtlasWithFocus(focus: { layer: string; name: string }): string {
  return replaceAppModeQuery('atlas', { atlasFocus: focus })
}

const PRESENTATION_RETURN_KEY = 'brain-app:presentation-return'

let learnReturnBeforePresentation: CanonicalQueryInput | null = null

function readPresentationReturn(): CanonicalQueryInput | null {
  try {
    const raw = sessionStorage.getItem(PRESENTATION_RETURN_KEY)
    if (raw) return JSON.parse(raw) as CanonicalQueryInput
  } catch {
    // private mode / quota
  }
  return learnReturnBeforePresentation
}

function writePresentationReturn(input: CanonicalQueryInput | null): void {
  learnReturnBeforePresentation = input
  try {
    if (input) sessionStorage.setItem(PRESENTATION_RETURN_KEY, JSON.stringify(input))
    else sessionStorage.removeItem(PRESENTATION_RETURN_KEY)
  } catch {
    // private mode / quota
  }
}

/** Merkt die aktuelle Lern-URL, bevor in die Praesentationssequenz gewechselt wird. */
export function bookmarkLearnBeforePresentation(): void {
  const loc = parseLocation(window.location.search)
  if (loc.sequenceKind === 'presentation') return
  if (!loc.configName && !loc.sceneId) {
    writePresentationReturn(null)
    return
  }
  writePresentationReturn({
    ...(loc.sequenceKind && loc.sequenceName ? { sequenceKind: loc.sequenceKind, sequenceName: loc.sequenceName } : {}),
    configName: loc.configName,
    sceneId: loc.sceneId,
    step: loc.step,
  })
}

export function enterPresentationSequence(sequenceName: string): string {
  bookmarkLearnBeforePresentation()
  const query = `?sequence=presentation.${sequenceName}`
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}

/** Praesentation verlassen und zuvor gemerkte Lernposition wiederherstellen. */
export function leavePresentationAndRestore(): string {
  const bookmark = readPresentationReturn()
  if (bookmark) {
    const query = replaceCanonicalLocation(bookmark)
    writePresentationReturn(null)
    return query
  }
  const params = new URLSearchParams(window.location.search)
  params.delete('sequence')
  params.delete('mode')
  const query = params.toString() ? `?${params.toString()}` : window.location.pathname
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}

export function navigateToLearnFromScene(input: CanonicalQueryInput | null): string {
  if (input?.configName || input?.sceneId) {
    return replaceCanonicalLocation(input)
  }
  const params = new URLSearchParams(window.location.search)
  params.delete('mode')
  params.delete('atlasLayer')
  params.delete('atlasArea')
  const query = params.toString() ? `?${params.toString()}` : window.location.pathname
  window.history.replaceState(null, '', query)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  return query
}
