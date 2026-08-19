import { loginRequest } from '@/api/resources/auth'
import type { ApiAuthContextValue } from '@/api/auth/ApiAuthProvider'
import { tokenStorage } from '@/api/token-storage'
import { normalizeApiError } from '@/api/errors'
import { loginRoleMatches, UnknownUserRoleError } from '@/api/roles'
import { activateLocalWorkspace } from '@/storage'
import { ensureDeviceRegisteredUntilOk } from '@/features/device'
import { getSyncEngine } from '@/sync/sync-engine'
import { cacheLoginSession, verifyOfflineLogin } from '@/features/auth/offline-auth'
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
 *
 * When the network is unreachable, falls back to locally cached credentials
 * from a previous successful login (offline-capable sign-in).
 */
export async function completeLiveLogin(
  input: {
    username: string
    password: string
    expectedRole: UserRole
  },
  apiAuth: Pick<ApiAuthContextValue, 'setSession' | 'clearSession'>,
): Promise<LoginResult> {
  try {
    return await completeOnlineLogin(input, apiAuth)
  } catch (error) {
    const apiError = normalizeApiError(error)
    if (!apiError.isNetworkError) throw apiError
    return attemptOfflineLogin(input, apiAuth)
  }
}

async function completeOnlineLogin(
  input: { username: string; password: string; expectedRole: UserRole },
  apiAuth: Pick<ApiAuthContextValue, 'setSession' | 'clearSession'>,
): Promise<LoginResult> {
  const session = await loginRequest({
    username: input.username,
    password: input.password,
  })

  if (!loginRoleMatches(session.user.role, input.expectedRole)) {
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

  await cacheLoginSession(input.username, input.password, session)

  apiAuth.setSession(tokens, session.apiUser)
  return { success: true, role: session.user.role, user: session.user }
}

async function attemptOfflineLogin(
  input: { username: string; password: string; expectedRole: UserRole },
  apiAuth: Pick<ApiAuthContextValue, 'setSession' | 'clearSession'>,
): Promise<LoginResult> {
  const session = await verifyOfflineLogin(input.username, input.password)
  if (!session) {
    return { success: false, error: 'invalid_credentials' }
  }

  if (!loginRoleMatches(session.user.role, input.expectedRole)) {
    return { success: false, error: 'wrong_role' }
  }

  const tokens = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
  tokenStorage.setTokens(tokens)
  await activateLocalWorkspace(session.user.id, session.user.centerId ?? undefined)

  getSyncEngine().setAuthRequired(true)

  apiAuth.setSession(tokens, session.apiUser)
  return { success: true, role: session.user.role, user: session.user }
}
