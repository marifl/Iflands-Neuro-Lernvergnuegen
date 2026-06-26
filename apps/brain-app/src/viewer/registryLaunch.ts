import { BONUS_CONTEXTS, type BonusContext } from './bonusContexts'
import { requiredString, optionalString } from './parseHelpers'
import { knowledgeCollectionById } from './knowledgeRegistry'
import type { AppMode } from './viewerStore'

export const REGISTRY_LAUNCH_SCHEMA_VERSION = 1

export type RegistryLaunchEntrypoint =
  | { kind: 'app-mode'; appMode: Extract<AppMode, 'learn' | 'explore'> }
  | { kind: 'case-study'; caseStudyId: string }
  | { kind: 'scene'; sceneId: string; configName?: string; step?: number }
  | { kind: 'config'; configName: string; sceneId?: string; step?: number }
  | { kind: 'animation'; animationId: string }
  | { kind: 'snapshot'; snapshotId: string }
  | { kind: 'timeline'; timelineId: string; stepId?: string; keyframeId?: string }

export interface RegistryLaunch {
  schemaVersion: typeof REGISTRY_LAUNCH_SCHEMA_VERSION
  collectionId: string
  contextId: string
  entrypoint: RegistryLaunchEntrypoint
}

interface RegistryLaunchInput {
  collectionId: string
  contextId: string
  entrypoint?: RegistryLaunchEntrypoint
}

const SEARCH_COLLECTION = 'collectionId'
const SEARCH_CONTEXT = 'contextId'
const SEARCH_ENTRYPOINT = 'entrypoint'

const EXPLICIT_ENTRYPOINTS: Record<string, RegistryLaunchEntrypoint> = {
  'case-phineas-gage/phineas-gage': { kind: 'case-study', caseStudyId: 'phineas-gage' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`RegistryLaunch: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`RegistryLaunch: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function optionalStep(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || typeof value !== 'number' || value < 0) {
    throw new Error(`RegistryLaunch: ${field} muss ein nicht-negativer Integer sein`)
  }
  return value
}

function launchKey(collectionId: string, contextId: string): string {
  return `${collectionId}/${contextId}`
}

function contextById(contextId: string): BonusContext | null {
  return BONUS_CONTEXTS.find((context) => context.id === contextId) ?? null
}

function validateCollectionContext(collectionId: string, contextId: string): BonusContext {
  const collection = knowledgeCollectionById(collectionId)
  if (!collection) throw new Error(`RegistryLaunch: collectionId "${collectionId}" ist nicht bekannt`)
  const context = contextById(contextId)
  if (!context) throw new Error(`RegistryLaunch: contextId "${contextId}" ist nicht bekannt`)
  if (!context.collectionIds.includes(collectionId)) {
    throw new Error(`RegistryLaunch: contextId "${contextId}" gehoert nicht zu collectionId "${collectionId}"`)
  }
  return context
}

function derivedEntrypoint(context: BonusContext): RegistryLaunchEntrypoint | null {
  const hints = context.animationHints
  if (hints?.sceneId) {
    return {
      kind: 'scene',
      sceneId: hints.sceneId,
      ...(hints.configName === undefined ? {} : { configName: hints.configName }),
      step: 0,
    }
  }
  return null
}

function defaultEntrypoint(collectionId: string, context: BonusContext): RegistryLaunchEntrypoint {
  const explicit = EXPLICIT_ENTRYPOINTS[launchKey(collectionId, context.id)]
  if (explicit) return explicit
  const derived = derivedEntrypoint(context)
  if (derived) return derived
  throw new Error(`RegistryLaunch: contextId "${context.id}" hat keinen EntryPoint`)
}

function parseEntrypoint(raw: unknown, field: string): RegistryLaunchEntrypoint {
  const value = assertRecord(raw, field)
  const kind = requiredString(value.kind, `${field}.kind`)
  switch (kind) {
    case 'app-mode': {
      assertKnownKeys(value, ['kind', 'appMode'], field)
      const appMode = requiredString(value.appMode, `${field}.appMode`)
      if (appMode === 'phineas') return { kind: 'case-study', caseStudyId: 'phineas-gage' }
      if (appMode !== 'learn' && appMode !== 'explore') {
        throw new Error(`RegistryLaunch: ${field}.appMode hat einen ungueltigen Wert`)
      }
      return { kind, appMode }
    }
    case 'case-study': {
      assertKnownKeys(value, ['kind', 'caseStudyId'], field)
      return { kind, caseStudyId: requiredString(value.caseStudyId, `${field}.caseStudyId`) }
    }
    case 'scene': {
      assertKnownKeys(value, ['kind', 'sceneId', 'configName', 'step'], field)
      const configName = optionalString(value.configName, `${field}.configName`)
      const step = optionalStep(value.step, `${field}.step`)
      return {
        kind,
        sceneId: requiredString(value.sceneId, `${field}.sceneId`),
        ...(configName === undefined ? {} : { configName }),
        ...(step === undefined ? {} : { step }),
      }
    }
    case 'config': {
      assertKnownKeys(value, ['kind', 'configName', 'sceneId', 'step'], field)
      const sceneId = optionalString(value.sceneId, `${field}.sceneId`)
      const step = optionalStep(value.step, `${field}.step`)
      return {
        kind,
        configName: requiredString(value.configName, `${field}.configName`),
        ...(sceneId === undefined ? {} : { sceneId }),
        ...(step === undefined ? {} : { step }),
      }
    }
    case 'animation':
      assertKnownKeys(value, ['kind', 'animationId'], field)
      return { kind, animationId: requiredString(value.animationId, `${field}.animationId`) }
    case 'snapshot':
      assertKnownKeys(value, ['kind', 'snapshotId'], field)
      return { kind, snapshotId: requiredString(value.snapshotId, `${field}.snapshotId`) }
    case 'timeline': {
      assertKnownKeys(value, ['kind', 'timelineId', 'stepId', 'keyframeId'], field)
      const stepId = optionalString(value.stepId, `${field}.stepId`)
      const keyframeId = optionalString(value.keyframeId, `${field}.keyframeId`)
      return {
        kind,
        timelineId: requiredString(value.timelineId, `${field}.timelineId`),
        ...(stepId === undefined ? {} : { stepId }),
        ...(keyframeId === undefined ? {} : { keyframeId }),
      }
    }
    default:
      throw new Error(`RegistryLaunch: ${field}.kind hat einen ungueltigen Wert`)
  }
}

function parseEntrypointParam(value: string | null): RegistryLaunchEntrypoint | undefined {
  if (!value) return undefined
  const [kind, id] = value.split(':', 2)
  if (!kind || !id) throw new Error('RegistryLaunch: entrypoint muss kind:id sein')
  if (kind === 'mode') return parseEntrypoint({ kind: 'app-mode', appMode: id }, 'entrypoint')
  if (kind === 'case-study') return parseEntrypoint({ kind: 'case-study', caseStudyId: id }, 'entrypoint')
  if (kind === 'scene') return parseEntrypoint({ kind: 'scene', sceneId: id, step: 0 }, 'entrypoint')
  if (kind === 'config') return parseEntrypoint({ kind: 'config', configName: id }, 'entrypoint')
  if (kind === 'animation') return parseEntrypoint({ kind: 'animation', animationId: id }, 'entrypoint')
  if (kind === 'snapshot') return parseEntrypoint({ kind: 'snapshot', snapshotId: id }, 'entrypoint')
  if (kind === 'timeline') return parseEntrypoint({ kind: 'timeline', timelineId: id }, 'entrypoint')
  throw new Error(`RegistryLaunch: entrypoint kind "${kind}" ist nicht bekannt`)
}

function entrypointParam(entrypoint: RegistryLaunchEntrypoint): string {
  switch (entrypoint.kind) {
    case 'app-mode':
      return `mode:${entrypoint.appMode}`
    case 'case-study':
      return `case-study:${entrypoint.caseStudyId}`
    case 'scene':
      return `scene:${entrypoint.sceneId}`
    case 'config':
      return `config:${entrypoint.configName}`
    case 'animation':
      return `animation:${entrypoint.animationId}`
    case 'snapshot':
      return `snapshot:${entrypoint.snapshotId}`
    case 'timeline':
      return `timeline:${entrypoint.timelineId}`
  }
}

export function resolveRegistryLaunch(input: RegistryLaunchInput): RegistryLaunch {
  const collectionId = requiredString(input.collectionId, 'collectionId')
  const contextId = requiredString(input.contextId, 'contextId')
  const context = validateCollectionContext(collectionId, contextId)
  return {
    schemaVersion: REGISTRY_LAUNCH_SCHEMA_VERSION,
    collectionId,
    contextId,
    entrypoint: input.entrypoint ? parseEntrypoint(input.entrypoint, 'entrypoint') : defaultEntrypoint(collectionId, context),
  }
}

export function parseRegistryLaunch(raw: unknown): RegistryLaunch {
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'collectionId', 'contextId', 'entrypoint'], 'Root')
  if (value.schemaVersion !== REGISTRY_LAUNCH_SCHEMA_VERSION) {
    throw new Error(`RegistryLaunch: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  return resolveRegistryLaunch({
    collectionId: requiredString(value.collectionId, 'collectionId'),
    contextId: requiredString(value.contextId, 'contextId'),
    entrypoint: parseEntrypoint(value.entrypoint, 'entrypoint'),
  })
}

export function parseOptionalRegistryLaunch(raw: unknown): RegistryLaunch | null {
  if (raw === undefined || raw === null) return null
  return parseRegistryLaunch(raw)
}

export function parseRegistryLaunchFromSearch(search: string): RegistryLaunch | null {
  const params = new URLSearchParams(search)
  const collectionId = params.get(SEARCH_COLLECTION)
  const contextId = params.get(SEARCH_CONTEXT)
  const entrypoint = params.get(SEARCH_ENTRYPOINT)
  if (!collectionId && !contextId && !entrypoint) return null
  if (!collectionId || !contextId) {
    throw new Error('RegistryLaunch: URL braucht collectionId und contextId gemeinsam')
  }
  return resolveRegistryLaunch({
    collectionId,
    contextId,
    entrypoint: parseEntrypointParam(entrypoint),
  })
}

function registryLaunchSearchParams(launch: RegistryLaunch): URLSearchParams {
  const parsed = parseRegistryLaunch(launch)
  const params = new URLSearchParams()
  params.set(SEARCH_COLLECTION, parsed.collectionId)
  params.set(SEARCH_CONTEXT, parsed.contextId)
  params.set(SEARCH_ENTRYPOINT, entrypointParam(parsed.entrypoint))
  switch (parsed.entrypoint.kind) {
    case 'app-mode':
      params.set('mode', parsed.entrypoint.appMode)
      break
    case 'case-study':
      params.set('mode', 'explore')
      params.set('case-study', parsed.entrypoint.caseStudyId)
      break
    case 'scene':
      if (parsed.entrypoint.configName) params.set('config', parsed.entrypoint.configName)
      params.set('scene', parsed.entrypoint.sceneId)
      if (parsed.entrypoint.step !== undefined) params.set('step', String(parsed.entrypoint.step))
      break
    case 'config':
      params.set('config', parsed.entrypoint.configName)
      if (parsed.entrypoint.sceneId) params.set('scene', parsed.entrypoint.sceneId)
      if (parsed.entrypoint.step !== undefined) params.set('step', String(parsed.entrypoint.step))
      break
    case 'animation':
    case 'snapshot':
    case 'timeline':
      break
  }
  return params
}

export function registryLaunchLocation(launch: RegistryLaunch): string {
  return `?${registryLaunchSearchParams(launch).toString()}`
}

export function appModeForRegistryLaunch(launch: RegistryLaunch): AppMode {
  const parsed = parseRegistryLaunch(launch)
  if (parsed.entrypoint.kind === 'app-mode') return parsed.entrypoint.appMode
  if (parsed.entrypoint.kind === 'case-study') return 'explore'
  if (parsed.entrypoint.kind === 'config') return 'explore'
  return 'learn'
}
