import { describe, expect, it, vi } from 'vitest'
import { flushAuthoringTransformDrafts, registerAuthoringTransformDraft } from './authoringTransformDraftRegistry'

describe('authoringTransformDraftRegistry', () => {
  it('flusht registrierte Transform-Drafts vor einem Target-Wechsel', () => {
    const flushA = vi.fn(() => false)
    const flushB = vi.fn(() => true)
    const unregisterA = registerAuthoringTransformDraft(flushA)
    const unregisterB = registerAuthoringTransformDraft(flushB)

    expect(flushAuthoringTransformDrafts()).toBe(true)
    expect(flushA).toHaveBeenCalledTimes(1)
    expect(flushB).toHaveBeenCalledTimes(1)

    unregisterA()
    unregisterB()
    expect(flushAuthoringTransformDrafts()).toBe(false)
  })
})
