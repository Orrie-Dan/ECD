import { env } from '@/config/env'
import { DEFAULT_CENTER_ID } from '@/lib/mock-data'

/**
 * Resolve the caretaker center scope.
 * MOCK may fall back to DEFAULT_CENTER_ID for demo flows.
 * LIVE must never silently substitute `c1`.
 */
export function resolveCenterId(userCenterId: string | null | undefined): string | null {
  if (userCenterId) return userCenterId
  if (env.isMock) return DEFAULT_CENTER_ID
  return null
}
