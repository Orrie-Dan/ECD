import { isLocalWriteError, toLocalWriteError } from '@/storage/local-write-error'
import { ChildUpdateRequiresOnlineError } from '@/features/children/local-children'
import { formatApiErrorMessage, isApiError, normalizeApiError } from '@/api/errors'
import {
  ProductionMockWritesBlockedError,
  productionMockWriteBlockedMessage,
} from '@/lib/live-api-guard'
import { common, messages } from '@/locales/rw/common'

export class ChildRegistrationRequiresCenterError extends Error {
  constructor() {
    super('CHILD_REGISTRATION_REQUIRES_CENTER')
    this.name = 'ChildRegistrationRequiresCenterError'
  }
}

function messageFromErrorText(message: string): string | undefined {
  if (message.includes('centerId is required')) return messages.mutationNoCenter
  if (message.includes('authenticated user id is required')) return messages.mutationNoUser
  if (message.includes('Child not found')) return messages.mutationNotFound
  if (message.includes('Transfers domain migration')) return messages.transferAcceptUnavailable
  return undefined
}

/**
 * Map persistence / offline-capability errors to caretaker-facing Kinyarwanda copy.
 * Never returns a "saved" success string.
 */
export function messageForMutationFailure(err: unknown): string {
  if (err instanceof ProductionMockWritesBlockedError) {
    return productionMockWriteBlockedMessage
  }

  if (err instanceof ChildUpdateRequiresOnlineError) {
    return common.sync.childEditNeedsOnline
  }

  if (err instanceof ChildRegistrationRequiresCenterError) {
    return messages.childRegisterNoCenter
  }

  const writeErr = isLocalWriteError(err) ? err : toLocalWriteError(err)
  if (writeErr.code === 'QUOTA_EXCEEDED') {
    return common.sync.storageFull
  }
  if (writeErr.code === 'UNAVAILABLE') {
    return common.sync.storageUnavailable
  }

  if (isApiError(err) || normalizeApiError(err).statusCode > 0) {
    return formatApiErrorMessage(err)
  }

  if (err instanceof Error) {
    const mapped = messageFromErrorText(err.message)
    if (mapped) return mapped
    if (err.message.startsWith('CHILD_')) {
      return messages.mutationFailed
    }
  }

  return messages.mutationFailed
}
