export type AuthoringHistoryKeyboardAction = 'undo' | 'redo'

export function authoringHistoryActionForKeyboardEvent(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): AuthoringHistoryKeyboardAction | null {
  if (event.altKey || (!event.metaKey && !event.ctrlKey)) return null
  const key = event.key.toLowerCase()
  if (key === 'z' && event.shiftKey) return 'redo'
  if (key === 'z') return 'undo'
  if (key === 'y') return 'redo'
  return null
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') return false
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('contenteditable') === 'true'
}
