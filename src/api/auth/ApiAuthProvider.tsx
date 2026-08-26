import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { env } from '@/config/env'
import { customInstance } from '@/api/client'
import { setApiSessionListeners, type TokenPair } from '@/api/interceptors'
import { tokenStorage } from '@/api/token-storage'
import { queryClient } from '@/api/query-client'
import { normalizeApiError, type ApiError } from '@/api/errors'
import { getSyncEngine } from '@/sync/sync-engine'
import { deactivateLocalWorkspace } from '@/storage/local-workspace'
import { clearBrowserDeviceIdentity } from '@/features/device'
import { auth } from '@/locales/rw/auth'
import type {
  AuthMeResponseDto,
  AuthTokensResponseDto,
  AuthUserResponseDto,
  LoginDto,
} from '@/api/generated/models'

export type ApiAuthStatus = 'idle' | 'authenticated' | 'unauthenticated'

/** User payload from login (summary) or /me (extended). */
export type ApiSessionUser = AuthUserResponseDto | AuthMeResponseDto

export interface ApiAuthContextValue {
  /** Current API mode from env. */
  mode: typeof env.apiMode
  isLive: boolean
  isMock: boolean
  status: ApiAuthStatus
  /** Backend auth user when LIVE session is active; null in MOCK or logged out. */
  apiUser: ApiSessionUser | null
  accessToken: string | null
  setSession: (tokens: TokenPair, user?: ApiSessionUser | null) => void
  clearSession: () => void
  /**
   * LIVE login against POST /api/v1/auth/login.
   * Throws in MOCK — existing AppContext login remains for UI demos.
   */
  loginWithApi: (credentials: LoginDto) => Promise<AuthTokensResponseDto>
  /** GET /api/v1/auth/me — refreshes apiUser when LIVE + tokens present. */
  refreshProfile: () => Promise<AuthMeResponseDto | null>
  lastError: ApiError | null
  clearLastError: () => void
}

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null)

function readInitialStatus(): ApiAuthStatus {
  if (env.isMock) return 'idle'
  return tokenStorage.getAccessToken() ? 'authenticated' : 'unauthenticated'
}

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const [apiUser, setApiUser] = useState<ApiSessionUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    env.isLive ? tokenStorage.getAccessToken() : null,
  )
  const [status, setStatus] = useState<ApiAuthStatus>(readInitialStatus)
  const [lastError, setLastError] = useState<ApiError | null>(null)

  const clearSession = useCallback(() => {
    tokenStorage.clearTokens()
    clearBrowserDeviceIdentity()
    setAccessToken(null)
    setApiUser(null)
    setStatus(env.isLive ? 'unauthenticated' : 'idle')
    void queryClient.clear()
    // Preserve per-user IndexedDB; only clear the active-owner pointer.
    void deactivateLocalWorkspace()
  }, [])

  const setSession = useCallback((tokens: TokenPair, user?: ApiSessionUser | null) => {
    tokenStorage.setTokens(tokens)
    setAccessToken(tokens.accessToken)
    setStatus('authenticated')
    if (user !== undefined) {
      setApiUser(user)
    }
    // Authenticated session must not keep a stale AUTH_REQUIRED flag from a
    // prior expiry — device bootstrap is a separate state.
    if (env.isLive) {
      getSyncEngine().setAuthRequired(false)
    }
  }, [])

  const clearLastError = useCallback(() => setLastError(null), [])

  const loginWithApi = useCallback(
    async (credentials: LoginDto): Promise<AuthTokensResponseDto> => {
      if (env.isMock) {
        throw new Error('loginWithApi is only available when VITE_API_MODE=live')
      }

      try {
        const data = await customInstance<AuthTokensResponseDto>({
          url: '/api/v1/auth/login',
          method: 'POST',
          data: credentials,
        })
        setSession(
          { accessToken: data.accessToken, refreshToken: data.refreshToken },
          data.user,
        )
        setLastError(null)
        return data
      } catch (error) {
        const apiError = normalizeApiError(error)
        setLastError(apiError)
        throw apiError
      }
    },
    [setSession],
  )

  const refreshProfile = useCallback(async (): Promise<AuthMeResponseDto | null> => {
    if (env.isMock || !tokenStorage.getAccessToken()) return null
    try {
      const me = await customInstance<AuthMeResponseDto>({
        url: '/api/v1/auth/me',
        method: 'GET',
      })
      setApiUser(me)
      setStatus('authenticated')
      return me
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.isUnauthorized) {
        clearSession()
      }
      setLastError(apiError)
      return null
    }
  }, [clearSession])

  useEffect(() => {
    setApiSessionListeners({
      onTokensRefreshed: (tokens) => {
        setAccessToken(tokens.accessToken)
        setStatus('authenticated')
        if (env.isLive) {
          getSyncEngine().setAuthRequired(false)
          void getSyncEngine().syncNow()
        }
      },
      onSessionExpired: () => {
        clearSession()
        if (env.isLive) {
          // Preserve IndexedDB / outbox — only sync requires re-auth.
          getSyncEngine().setAuthRequired(true)
        }
        setLastError({
          statusCode: 401,
          message: auth.login.sessionExpired,
          messages: [auth.login.sessionExpired],
          isNetworkError: false,
          isUnauthorized: true,
          isForbidden: false,
          isConflict: false,
          isValidationError: false,
          isNotFound: false,
        })
      },
    })

    return () =>
      setApiSessionListeners({
        onTokensRefreshed: null,
        onSessionExpired: null,
      })
  }, [clearSession])

  useEffect(() => {
    if (env.isLive && tokenStorage.getAccessToken()) {
      void refreshProfile()
    }
  }, [refreshProfile])

  const value = useMemo<ApiAuthContextValue>(
    () => ({
      mode: env.apiMode,
      isLive: env.isLive,
      isMock: env.isMock,
      status,
      apiUser,
      accessToken,
      setSession,
      clearSession,
      loginWithApi,
      refreshProfile,
      lastError,
      clearLastError,
    }),
    [
      status,
      apiUser,
      accessToken,
      setSession,
      clearSession,
      loginWithApi,
      refreshProfile,
      lastError,
      clearLastError,
    ],
  )

  return <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>
}

export function useApiAuth(): ApiAuthContextValue {
  const ctx = useContext(ApiAuthContext)
  if (!ctx) {
    throw new Error('useApiAuth must be used within ApiAuthProvider')
  }
  return ctx
}
