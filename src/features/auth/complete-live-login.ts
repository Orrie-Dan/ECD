import { loginRequest } from '@/api/resources/auth'
import type { ApiAuthContextValue } from '@/api/auth/ApiAuthProvider'
import { tokenStorage } from '@/api/token-storage'
import { normalizeApiError } from '@/api/errors'
import { hasRole, UnknownUserRoleError } from '@/api/roles'
import { activateLocalWorkspace } from '@/storage'
import { ensureDeviceRegisteredUntilOk } from '@/features/device'
import type { UserRole } from '@/types'
import type { LoginResult } from '@/features/auth/login-result'

/**
 * LIVE login: credentials must succeed AND the device must be registered
 * with the server before the session is treated as complete. Retries
 * register until the server acknowledges (or the session is unauthorized).
 *
 * Tokens are written to storage so /devices/register can authorize, but
 * `setSession` is not called until register succeeds — otherwise /auth/me
 * would hydrate the UI user and let the caregiver in without a device.
 */
export async function completeLiveLogin(
  input: {
    username: string
    password: string
    expectedRole: UserRole
  },
  apiAuth: Pick<ApiAuthContextValue, 'setSession' | 'clearSession'>,
): Promise<LoginResult> {
  const session = await loginRequest({
    username: input.username,
    password: input.password,
  })

  if (!hasRole(session.user, input.expectedRole)) {
    return { success: false, error: 'wrong_role' }
  }

  const tokens = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
  tokenStorage.setTokens(tokens)

  try {
    await activateLocalWorkspace(session.user.id, session.user.centerId ?? undefined)
    const device = await ensureDeviceRegisteredUntilOk({
      userId: session.user.id,
      centerId: session.user.centerId ?? undefined,
      requireServerAck: true,
    })
    if (!device.ok) {
      apiAuth.clearSession()
      if (device.reason === 'unauthorized') {
        return { success: false, error: 'invalid_credentials' }
      }
      return { success: false, error: 'api_unavailable' }
    }
  } catch (error) {
    apiAuth.clearSession()
    if (error instanceof UnknownUserRoleError) {
      return { success: false, error: 'invalid_credentials' }
    }
    const apiError = normalizeApiError(error)
    if (apiError.isUnauthorized) {
      return { success: false, error: 'invalid_credentials' }
    }
    throw apiError
  }

  apiAuth.setSession(tokens, session.apiUser)
  return { success: true, role: session.user.role, user: session.user }
}
