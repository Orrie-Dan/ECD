import { normalizeApiError } from '@/api/errors'

export type OutboxFailureClass = 'retryable' | 'blocked' | 'permanent'

export type BlockedReason = 'village_reference' | 'dependency' | 'other'

/** Outbox lastError when child create cannot sync until homeVillageId is resolved. */
export const VILLAGE_REFERENCE_BLOCKED_ERROR = 'homeVillageId required before sync'

const RETRYABLE_PATTERNS = [
  /session poll timed out/i,
  /session still processing/i,
  /retryable/i,
  /max recovery retries/i,
  /parent child not yet applied/i,
  /waiting for dependency/i,
  /econnrefused/i,
  /timeout/i,
  /network/i,
  /server unavailable/i,
  /p2003/i,
  /foreign key/i,
  /could not serialize/i,
  /too many clients/i,
  /redis/i,
]

const BLOCKED_PATTERNS = [
  /device does not belong/i,
  /already registered to another user/i,
  /homevillageid required/i,
  /sign in required/i,
  /unauthorized/i,
]

const PERMANENT_PATTERNS = [
  /append-only/i,
  /unsupported (entity|operation)/i,
  /irreconcilable/i,
  /invalid immutable/i,
  /cannot be updated/i,
  /cannot transition/i,
]

export function classifyOutboxError(lastError?: string | null): OutboxFailureClass {
  if (!lastError) return 'retryable'
  if (PERMANENT_PATTERNS.some((p) => p.test(lastError))) return 'permanent'
  if (BLOCKED_PATTERNS.some((p) => p.test(lastError))) return 'blocked'
  if (RETRYABLE_PATTERNS.some((p) => p.test(lastError))) return 'retryable'
  return 'retryable'
}

export function isRetryableOutboxError(lastError?: string | null): boolean {
  return classifyOutboxError(lastError) === 'retryable'
}

export function isPermanentOutboxError(lastError?: string | null): boolean {
  return classifyOutboxError(lastError) === 'permanent'
}

export function isDeviceOwnershipError(error: unknown): boolean {
  const apiError = normalizeApiError(error)
  if (!apiError.isForbidden && apiError.statusCode !== 403) return false
  return /device/i.test(apiError.message) && /belong|authenticated user/i.test(apiError.message)
}

export function isServerUnavailableError(error: unknown): boolean {
  const apiError = normalizeApiError(error)
  if (apiError.isNetworkError) return true
  return apiError.statusCode >= 500
}

export function isVillageReferenceBlocked(lastError?: string | null): boolean {
  return /homevillageid required/i.test(lastError ?? '')
}

export function classifyBlockedReason(lastError?: string | null): BlockedReason {
  if (isVillageReferenceBlocked(lastError)) return 'village_reference'
  if (/waiting for dependency/i.test(lastError ?? '')) return 'dependency'
  return 'other'
}
