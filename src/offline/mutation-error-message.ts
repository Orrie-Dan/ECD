import { isLocalWriteError, toLocalWriteError } from '@/storage/local-write-error'
import { ChildUpdateRequiresOnlineError } from '@/features/children/local-children'
import { common, messages } from '@/locales/rw/common'

/**
 * Map persistence / offline-capability errors to caretaker-facing Kinyarwanda copy.
 * Never returns a "saved" success string.
 */
export function messageForMutationFailure(err: unknown): string {
  if (err instanceof ChildUpdateRequiresOnlineError) {
    return common.sync.childEditNeedsOnline
  }

  const writeErr = isLocalWriteError(err) ? err : toLocalWriteError(err)
  if (writeErr.code === 'QUOTA_EXCEEDED') {
    return common.sync.storageFull
  }
  if (writeErr.code === 'UNAVAILABLE') {
    return common.sync.storageUnavailable
  }

  if (err instanceof Error && err.message && !err.message.startsWith('CHILD_')) {
    // Prefer localized storage messages; fall back to generic incomplete form.
  }

  return messages.formIncomplete
}
