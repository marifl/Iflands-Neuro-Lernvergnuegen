import { create } from 'zustand'

export const STUDENT_PROGRESS_SCHEMA_VERSION = 1

export type StudentStepStatus = 'not-started' | 'seen' | 'checked'
export type StudentCheckResult = 'passed' | 'needs-review'

export interface StudentProgressStepSource {
  configName: string
  sceneId: string
  title: string
  figure?: string
}

export interface StudentProgressCheck {
  checkId: string
  result: StudentCheckResult
  attempts: number
  updatedAt: string
}

export interface StudentProgressStep {
  configName: string
  sceneId: string
  title: string
  figure?: string
  status: StudentStepStatus
  seenAt?: string
  checks?: StudentProgressCheck[]
}

export interface StudentProgressState {
  schemaVersion: typeof STUDENT_PROGRESS_SCHEMA_VERSION
  sequenceKind: 'learning'
  sequenceName: string
  currentConfigName?: string
  steps: StudentProgressStep[]
}

interface StudentProgressStoreState {
  progress: StudentProgressState | null
  setStudentProgress: (progress: StudentProgressState | null) => void
  resetStudentProgress: () => void
}

const STEP_STATUSES = ['not-started', 'seen', 'checked'] as const satisfies readonly StudentStepStatus[]
const CHECK_RESULTS = ['passed', 'needs-review'] as const satisfies readonly StudentCheckResult[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`StudentProgress: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`StudentProgress: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`StudentProgress: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`StudentProgress: ${field} muss ein positiver Integer sein`)
  }
  return value
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`StudentProgress: ${field} hat einen ungueltigen Wert`)
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`StudentProgress: ${field} muss ein Array sein`)
  return value.map((item, index) => parseItem(item, `${field}[${index}]`))
}

function parseOptionalArray<T>(
  value: unknown,
  field: string,
  parseItem: (item: unknown, field: string) => T,
): T[] | undefined {
  if (value === undefined) return undefined
  return parseArray(value, field, parseItem)
}

function assertUnique(ids: readonly string[], field: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`StudentProgress: ${field} enthaelt doppelte ID "${id}"`)
    seen.add(id)
  }
}

function parseCheck(raw: unknown, field: string): StudentProgressCheck {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['checkId', 'result', 'attempts', 'updatedAt'], field)
  return {
    checkId: requiredString(value.checkId, `${field}.checkId`),
    result: enumValue(value.result, CHECK_RESULTS, `${field}.result`),
    attempts: positiveInteger(value.attempts, `${field}.attempts`),
    updatedAt: requiredString(value.updatedAt, `${field}.updatedAt`),
  }
}

function parseStep(raw: unknown, field: string): StudentProgressStep {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['configName', 'sceneId', 'title', 'figure', 'status', 'seenAt', 'checks'], field)
  const figure = optionalString(value.figure, `${field}.figure`)
  const seenAt = optionalString(value.seenAt, `${field}.seenAt`)
  const checks = parseOptionalArray(value.checks, `${field}.checks`, parseCheck)
  return {
    configName: requiredString(value.configName, `${field}.configName`),
    sceneId: requiredString(value.sceneId, `${field}.sceneId`),
    title: requiredString(value.title, `${field}.title`),
    ...(figure === undefined ? {} : { figure }),
    status: enumValue(value.status, STEP_STATUSES, `${field}.status`),
    ...(seenAt === undefined ? {} : { seenAt }),
    ...(checks === undefined ? {} : { checks }),
  }
}

function validateState(state: StudentProgressState): void {
  assertUnique(state.steps.map((step) => step.configName), 'steps.configName')
  if (state.currentConfigName && !state.steps.some((step) => step.configName === state.currentConfigName)) {
    throw new Error(`StudentProgress: currentConfigName "${state.currentConfigName}" ist nicht in steps definiert`)
  }
  state.steps.forEach((step, index) => {
    if (step.status === 'not-started' && step.seenAt) {
      throw new Error(`StudentProgress: steps[${index}].seenAt passt nicht zu not-started`)
    }
    if (step.status === 'checked' && !step.checks?.length) {
      throw new Error(`StudentProgress: steps[${index}] braucht checks fuer status checked`)
    }
    if (step.checks) assertUnique(step.checks.map((check) => check.checkId), `steps[${index}].checks.checkId`)
  })
}

export function createStudentProgressState(
  sequenceName: string,
  sources: readonly StudentProgressStepSource[],
): StudentProgressState {
  const state: StudentProgressState = {
    schemaVersion: STUDENT_PROGRESS_SCHEMA_VERSION,
    sequenceKind: 'learning',
    sequenceName: requiredString(sequenceName, 'sequenceName'),
    ...(sources[0] === undefined ? {} : { currentConfigName: sources[0].configName }),
    steps: sources.map((source) => ({
      configName: requiredString(source.configName, 'source.configName'),
      sceneId: requiredString(source.sceneId, 'source.sceneId'),
      title: requiredString(source.title, 'source.title'),
      ...(source.figure === undefined ? {} : { figure: source.figure }),
      status: 'not-started',
    })),
  }
  validateState(state)
  return state
}

export function parseStudentProgressState(raw: unknown): StudentProgressState | null {
  if (raw === undefined || raw === null) return null
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'sequenceKind', 'sequenceName', 'currentConfigName', 'steps'], 'Root')
  if (value.schemaVersion !== STUDENT_PROGRESS_SCHEMA_VERSION) {
    throw new Error(`StudentProgress: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  if (value.sequenceKind !== 'learning') throw new Error('StudentProgress: sequenceKind muss "learning" sein')
  const currentConfigName = optionalString(value.currentConfigName, 'currentConfigName')
  const state: StudentProgressState = {
    schemaVersion: STUDENT_PROGRESS_SCHEMA_VERSION,
    sequenceKind: 'learning',
    sequenceName: requiredString(value.sequenceName, 'sequenceName'),
    ...(currentConfigName === undefined ? {} : { currentConfigName }),
    steps: parseArray(value.steps, 'steps', parseStep),
  }
  validateState(state)
  return state
}

export function markStudentStepSeen(
  rawState: StudentProgressState,
  configName: string,
  seenAt: string,
): StudentProgressState {
  const state = parseStudentProgressState(rawState)
  if (!state) throw new Error('StudentProgress: state fehlt')
  const found = state.steps.some((step) => step.configName === configName)
  if (!found) throw new Error(`StudentProgress: configName "${configName}" ist nicht in steps definiert`)
  return parseStudentProgressState({
    ...state,
    currentConfigName: configName,
    steps: state.steps.map((step) => step.configName === configName
      ? { ...step, status: step.status === 'checked' ? 'checked' : 'seen', seenAt }
      : step),
  })!
}

export function recordStudentCheck(
  rawState: StudentProgressState,
  configName: string,
  checkId: string,
  result: StudentCheckResult,
  updatedAt: string,
): StudentProgressState {
  const state = parseStudentProgressState(rawState)
  if (!state) throw new Error('StudentProgress: state fehlt')
  const step = state.steps.find((candidate) => candidate.configName === configName)
  if (!step) throw new Error(`StudentProgress: configName "${configName}" ist nicht in steps definiert`)
  const previous = step.checks?.find((check) => check.checkId === checkId)
  const nextCheck: StudentProgressCheck = {
    checkId: requiredString(checkId, 'checkId'),
    result,
    attempts: (previous?.attempts ?? 0) + 1,
    updatedAt: requiredString(updatedAt, 'updatedAt'),
  }
  const checks = [
    ...(step.checks ?? []).filter((check) => check.checkId !== checkId),
    nextCheck,
  ].sort((a, b) => a.checkId.localeCompare(b.checkId))
  return parseStudentProgressState({
    ...state,
    currentConfigName: configName,
    steps: state.steps.map((candidate) => candidate.configName === configName
      ? { ...candidate, status: 'checked', checks }
      : candidate),
  })!
}

export function studentCompletionRatio(state: StudentProgressState): number {
  const parsed = parseStudentProgressState(state)
  if (!parsed || parsed.steps.length === 0) return 0
  const completed = parsed.steps.filter((step) => step.status === 'checked').length
  return completed / parsed.steps.length
}

export function toStudentProgressStateJson(state: StudentProgressState): string {
  return JSON.stringify(parseStudentProgressState(state), null, 2)
}

export const useStudentProgressStore = create<StudentProgressStoreState>((set) => ({
  progress: null,
  setStudentProgress: (progress) => set({ progress: parseStudentProgressState(progress) }),
  resetStudentProgress: () => set({ progress: null }),
}))
