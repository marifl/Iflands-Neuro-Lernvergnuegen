import type { AuthoringScene } from './authoringScene'
import {
  executeAuthoringCommand,
  parseAuthoringCommand,
  undoAuthoringCommand,
  type AuthoringCommand,
} from './authoringCommands'

export const AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION = 1

export interface AuthoringCommandHistory {
  schemaVersion: typeof AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION
  commands: AuthoringCommand[]
  cursor: number
}

export interface AuthoringHistoryTransition {
  scene: AuthoringScene
  history: AuthoringCommandHistory
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`AuthoringCommandHistory: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`AuthoringCommandHistory: ${field} enthaelt unbekanntes Feld "${key}"`)
    }
  }
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 0) {
    throw new Error(`AuthoringCommandHistory: ${field} muss ein nicht-negativer Integer sein`)
  }
  return value
}

function commandAtCursor(history: AuthoringCommandHistory, offset: number): AuthoringCommand {
  const command = history.commands[history.cursor + offset]
  if (!command) throw new Error('AuthoringCommandHistory: Cursor zeigt auf keinen Command')
  return command
}

export function emptyAuthoringCommandHistory(): AuthoringCommandHistory {
  return {
    schemaVersion: AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION,
    commands: [],
    cursor: 0,
  }
}

export function parseAuthoringCommandHistory(raw: unknown): AuthoringCommandHistory {
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'commands', 'cursor'], 'Root')
  if (value.schemaVersion !== AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION) {
    throw new Error(
      `AuthoringCommandHistory: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`,
    )
  }
  if (!Array.isArray(value.commands)) throw new Error('AuthoringCommandHistory: commands muss ein Array sein')
  const commands = value.commands.map((command, index) => parseAuthoringCommandWithField(command, `commands[${index}]`))
  const cursor = nonNegativeInteger(value.cursor, 'cursor')
  if (cursor > commands.length) throw new Error('AuthoringCommandHistory: cursor darf nicht hinter commands liegen')
  return { schemaVersion: AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION, commands, cursor }
}

function parseAuthoringCommandWithField(raw: unknown, field: string): AuthoringCommand {
  try {
    return parseAuthoringCommand(raw)
  } catch (error) {
    if (error instanceof Error) throw new Error(`AuthoringCommandHistory: ${field} ist ungueltig: ${error.message}`)
    throw error
  }
}

export function toAuthoringCommandHistoryJson(history: AuthoringCommandHistory): string {
  return JSON.stringify(parseAuthoringCommandHistory(history), null, 2)
}

export function pushAuthoringCommand(
  history: AuthoringCommandHistory,
  command: AuthoringCommand,
): AuthoringCommandHistory {
  const parsedHistory = parseAuthoringCommandHistory(history)
  const parsedCommand = parseAuthoringCommand(command)
  return {
    schemaVersion: AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION,
    commands: [...parsedHistory.commands.slice(0, parsedHistory.cursor), parsedCommand],
    cursor: parsedHistory.cursor + 1,
  }
}

export function undoAuthoringCommandHistory(
  scene: AuthoringScene,
  history: AuthoringCommandHistory,
): AuthoringHistoryTransition {
  const parsedHistory = parseAuthoringCommandHistory(history)
  if (parsedHistory.cursor === 0) {
    throw new Error('AuthoringCommandHistory: Undo ist am Anfang der History nicht moeglich')
  }
  const command = commandAtCursor(parsedHistory, -1)
  return {
    scene: undoAuthoringCommand(scene, command),
    history: { ...parsedHistory, cursor: parsedHistory.cursor - 1 },
  }
}

export function redoAuthoringCommandHistory(
  scene: AuthoringScene,
  history: AuthoringCommandHistory,
): AuthoringHistoryTransition {
  const parsedHistory = parseAuthoringCommandHistory(history)
  if (parsedHistory.cursor === parsedHistory.commands.length) {
    throw new Error('AuthoringCommandHistory: Redo ist am Ende der History nicht moeglich')
  }
  const command = commandAtCursor(parsedHistory, 0)
  return {
    scene: executeAuthoringCommand(scene, command),
    history: { ...parsedHistory, cursor: parsedHistory.cursor + 1 },
  }
}
