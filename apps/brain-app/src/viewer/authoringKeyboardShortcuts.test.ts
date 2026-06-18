import { describe, expect, it } from 'vitest'
import {
  authoringHistoryActionForKeyboardEvent,
  isEditableKeyboardTarget,
} from './authoringKeyboardShortcuts'

function keyEvent(input: Partial<Parameters<typeof authoringHistoryActionForKeyboardEvent>[0]>) {
  return {
    key: 'z',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...input,
  }
}

describe('authoring keyboard shortcuts', () => {
  it('mapped Cmd/Ctrl-Z auf Undo und Shift-Z/Y auf Redo', () => {
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z', metaKey: true }))).toBe('undo')
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z', ctrlKey: true }))).toBe('undo')
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z', metaKey: true, shiftKey: true }))).toBe('redo')
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe('redo')
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'y', metaKey: true }))).toBe('redo')
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'y', ctrlKey: true }))).toBe('redo')
  })

  it('ignoriert Alt-Kombinationen und normale Buchstaben', () => {
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z' }))).toBeNull()
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'z', metaKey: true, altKey: true }))).toBeNull()
    expect(authoringHistoryActionForKeyboardEvent(keyEvent({ key: 'x', metaKey: true }))).toBeNull()
  })

  it('erkennt Textfelder und contenteditable als eigene Undo-Ziele', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    const button = document.createElement('button')

    expect(isEditableKeyboardTarget(input)).toBe(true)
    expect(isEditableKeyboardTarget(textarea)).toBe(true)
    expect(isEditableKeyboardTarget(select)).toBe(true)
    expect(isEditableKeyboardTarget(div)).toBe(true)
    expect(isEditableKeyboardTarget(button)).toBe(false)
    expect(isEditableKeyboardTarget(null)).toBe(false)
  })
})
