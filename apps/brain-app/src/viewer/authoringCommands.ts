import {
  parseAuthoringScene,
  parseAuthoringTransform,
  type AuthoringScene,
  type AuthoringTransform,
} from './authoringScene'
import { requiredString, optionalString } from './parseHelpers'
import { parseSequenceTargetRef, type SequenceTargetRef } from './sequenceTargetRef'

export const AUTHORING_COMMAND_SCHEMA_VERSION = 1

export type AuthoringCommandKind = 'set-transform' | 'batch'
export type AuthoringAssetInstanceTargetRef = Extract<SequenceTargetRef, { targetKind: 'asset-instance' }>

export interface SetTransformAuthoringCommand {
  schemaVersion: typeof AUTHORING_COMMAND_SCHEMA_VERSION
  commandId: string
  kind: 'set-transform'
  targetRef: AuthoringAssetInstanceTargetRef
  before: AuthoringTransform
  after: AuthoringTransform
  label?: string
}

export interface BatchAuthoringCommand {
  schemaVersion: typeof AUTHORING_COMMAND_SCHEMA_VERSION
  commandId: string
  kind: 'batch'
  commands: SetTransformAuthoringCommand[]
  label?: string
}

export type AuthoringCommand = SetTransformAuthoringCommand | BatchAuthoringCommand

interface SetTransformCommandInput {
  commandId: string
  targetRef: AuthoringAssetInstanceTargetRef
  after: AuthoringTransform
  label?: string
}

interface BatchCommandInput {
  commandId: string
  commands: readonly SetTransformAuthoringCommand[]
  label?: string
}

interface SetTransformTransactionInput {
  commandId: string
  commands: readonly SetTransformAuthoringCommand[]
  label?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`AuthoringCommand: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`AuthoringCommand: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function commandKind(value: unknown, field: string): AuthoringCommandKind {
  if (value === 'set-transform' || value === 'batch') return value
  throw new Error(`AuthoringCommand: ${field} hat einen ungueltigen Wert`)
}

function assertCommandSchemaVersion(value: unknown, field: string): void {
  if (value !== AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new Error(`AuthoringCommand: ${field} schemaVersion "${String(value)}" wird nicht unterstuetzt`)
  }
}

function parseTargetRef(raw: unknown, field: string): AuthoringAssetInstanceTargetRef {
  let ref: SequenceTargetRef
  try {
    ref = parseSequenceTargetRef(raw)
  } catch (error) {
    if (error instanceof Error) throw new Error(`AuthoringCommand: ${field} ist ungueltig: ${error.message}`)
    throw error
  }
  if (ref.targetKind !== 'asset-instance') {
    throw new Error(`AuthoringCommand: ${field}.targetKind muss "asset-instance" sein`)
  }
  return ref
}

function parseTransform(raw: unknown, field: string): AuthoringTransform {
  try {
    return parseAuthoringTransform(raw, field)
  } catch (error) {
    if (error instanceof Error) throw new Error(`AuthoringCommand: ${field} ist ungueltig: ${error.message}`)
    throw error
  }
}

function parseSetTransformCommand(raw: unknown, field: string): SetTransformAuthoringCommand {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['schemaVersion', 'commandId', 'kind', 'targetRef', 'before', 'after', 'label'], field)
  assertCommandSchemaVersion(value.schemaVersion, field)
  if (commandKind(value.kind, `${field}.kind`) !== 'set-transform') {
    throw new Error(`AuthoringCommand: ${field}.kind muss "set-transform" sein`)
  }
  const label = optionalString(value.label, `${field}.label`)
  return {
    schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
    commandId: requiredString(value.commandId, `${field}.commandId`),
    kind: 'set-transform',
    targetRef: parseTargetRef(value.targetRef, `${field}.targetRef`),
    before: parseTransform(value.before, `${field}.before`),
    after: parseTransform(value.after, `${field}.after`),
    ...(label === undefined ? {} : { label }),
  }
}

function parseCommand(raw: unknown, field: string): AuthoringCommand {
  const value = assertRecord(raw, field)
  const kind = commandKind(value.kind, `${field}.kind`)
  if (kind === 'set-transform') return parseSetTransformCommand(value, field)
  return parseBatchCommand(value, field)
}

function parseBatchCommand(raw: unknown, field: string): BatchAuthoringCommand {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['schemaVersion', 'commandId', 'kind', 'commands', 'label'], field)
  assertCommandSchemaVersion(value.schemaVersion, field)
  if (commandKind(value.kind, `${field}.kind`) !== 'batch') {
    throw new Error(`AuthoringCommand: ${field}.kind muss "batch" sein`)
  }
  if (!Array.isArray(value.commands) || value.commands.length === 0) {
    throw new Error(`AuthoringCommand: ${field}.commands muss ein nicht-leeres Array sein`)
  }
  const label = optionalString(value.label, `${field}.label`)
  return {
    schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
    commandId: requiredString(value.commandId, `${field}.commandId`),
    kind: 'batch',
    commands: value.commands.map((command, index) => parseSetTransformCommand(command, `${field}.commands[${index}]`)),
    ...(label === undefined ? {} : { label }),
  }
}

function sameTargetRef(a: AuthoringAssetInstanceTargetRef, b: AuthoringAssetInstanceTargetRef): boolean {
  return a.collectionId === b.collectionId && a.instanceId === b.instanceId
}

function targetLabel(targetRef: AuthoringAssetInstanceTargetRef): string {
  return `${targetRef.collectionId}/${targetRef.instanceId}`
}

function applySetTransform(
  scene: AuthoringScene,
  command: SetTransformAuthoringCommand,
  transform: AuthoringTransform,
): AuthoringScene {
  const parsedScene = parseAuthoringScene(scene)
  const instanceIndex = parsedScene.assetInstances.findIndex((instance) =>
    instance.collectionId === command.targetRef.collectionId && instance.instanceId === command.targetRef.instanceId
  )
  if (instanceIndex === -1) {
    throw new Error(`AuthoringCommand: targetRef "${targetLabel(command.targetRef)}" ist in AuthoringScene nicht definiert`)
  }
  const assetInstances = parsedScene.assetInstances.map((instance, index) =>
    index === instanceIndex ? { ...instance, transform } : instance
  )
  return parseAuthoringScene({ ...parsedScene, assetInstances })
}

export function parseAuthoringCommand(raw: unknown): AuthoringCommand {
  return parseCommand(raw, 'Root')
}

export function toAuthoringCommandJson(command: AuthoringCommand): string {
  return JSON.stringify(parseAuthoringCommand(command), null, 2)
}

export function createSetTransformCommand(
  scene: AuthoringScene,
  input: SetTransformCommandInput,
): SetTransformAuthoringCommand {
  const targetRef = parseTargetRef(input.targetRef, 'targetRef')
  const parsedScene = parseAuthoringScene(scene)
  const target = parsedScene.assetInstances.find((instance) =>
    instance.collectionId === targetRef.collectionId && instance.instanceId === targetRef.instanceId
  )
  if (!target) {
    throw new Error(`AuthoringCommand: targetRef "${targetLabel(targetRef)}" ist in AuthoringScene nicht definiert`)
  }
  return parseSetTransformCommand({
    schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
    commandId: input.commandId,
    kind: 'set-transform',
    targetRef,
    before: target.transform,
    after: input.after,
    ...(input.label === undefined ? {} : { label: input.label }),
  }, 'Root')
}

export function createAuthoringBatchCommand(input: BatchCommandInput): BatchAuthoringCommand {
  return parseBatchCommand({
    schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
    commandId: input.commandId,
    kind: 'batch',
    commands: [...input.commands],
    ...(input.label === undefined ? {} : { label: input.label }),
  }, 'Root')
}

export function coalesceSetTransformTransaction(input: SetTransformTransactionInput): SetTransformAuthoringCommand {
  if (input.commands.length === 0) {
    throw new Error('AuthoringCommand: Drag-Transaction braucht mindestens einen Command')
  }
  const commands = input.commands.map((command, index) => parseSetTransformCommand(command, `commands[${index}]`))
  const first = commands[0]
  const last = commands[commands.length - 1]
  if (!commands.every((command) => sameTargetRef(command.targetRef, first.targetRef))) {
    throw new Error('AuthoringCommand: Drag-Transaction darf keine gemischten targets enthalten')
  }
  return parseSetTransformCommand({
    schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
    commandId: input.commandId,
    kind: 'set-transform',
    targetRef: first.targetRef,
    before: first.before,
    after: last.after,
    ...(input.label === undefined ? {} : { label: input.label }),
  }, 'Root')
}

export function executeAuthoringCommand(scene: AuthoringScene, command: AuthoringCommand): AuthoringScene {
  const parsedCommand = parseAuthoringCommand(command)
  if (parsedCommand.kind === 'set-transform') return applySetTransform(scene, parsedCommand, parsedCommand.after)
  return parsedCommand.commands.reduce((nextScene, child) => executeAuthoringCommand(nextScene, child), scene)
}

export function undoAuthoringCommand(scene: AuthoringScene, command: AuthoringCommand): AuthoringScene {
  const parsedCommand = parseAuthoringCommand(command)
  if (parsedCommand.kind === 'set-transform') return applySetTransform(scene, parsedCommand, parsedCommand.before)
  return [...parsedCommand.commands]
    .reverse()
    .reduce((nextScene, child) => undoAuthoringCommand(nextScene, child), scene)
}

export function executeAuthoringCommandInScenes(
  scenes: readonly AuthoringScene[],
  sceneId: string,
  command: AuthoringCommand,
): AuthoringScene[] {
  const parsedScenes = scenes.map((scene) => parseAuthoringScene(scene))
  const index = parsedScenes.findIndex((scene) => scene.sceneId === sceneId)
  if (index === -1) throw new Error(`AuthoringCommand: sceneId "${sceneId}" ist nicht definiert`)
  return parsedScenes.map((scene, sceneIndex) =>
    sceneIndex === index ? executeAuthoringCommand(scene, command) : scene
  )
}
