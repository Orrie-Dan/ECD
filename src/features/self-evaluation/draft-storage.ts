import type { SelfEvalDraft } from './types'

const STORAGE_PREFIX = 'ecd-self-eval-draft'

function key(centerId: string): string {
  return `${STORAGE_PREFIX}:${centerId}`
}

export function loadSelfEvalDraft(centerId: string): SelfEvalDraft | null {
  if (!centerId) return null
  try {
    const raw = localStorage.getItem(key(centerId))
    if (!raw) return null
    return JSON.parse(raw) as SelfEvalDraft
  } catch {
    return null
  }
}

export function saveSelfEvalDraft(draft: SelfEvalDraft): void {
  localStorage.setItem(key(draft.centerId), JSON.stringify(draft))
}

export function clearSelfEvalDraft(centerId: string): void {
  localStorage.removeItem(key(centerId))
}

export function createDraftId(): string {
  return crypto.randomUUID()
}
