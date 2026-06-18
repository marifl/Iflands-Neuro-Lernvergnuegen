type AuthoringTransformDraftFlush = () => boolean

const flushers = new Set<AuthoringTransformDraftFlush>()

export function registerAuthoringTransformDraft(flush: AuthoringTransformDraftFlush): () => void {
  flushers.add(flush)
  return () => {
    flushers.delete(flush)
  }
}

export function flushAuthoringTransformDrafts(): boolean {
  let flushed = false
  for (const flush of [...flushers]) {
    flushed = flush() || flushed
  }
  return flushed
}
