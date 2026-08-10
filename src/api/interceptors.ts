import axios, { type AxiosError, isAxiosError } from 'axios'
import { env } from '@/config/env'
import { tokenStorage } from '@/api/token-storage'
import { normalizeApiError, type ApiError } from '@/api/errors'

type RetriableConfig = import('axios').InternalAxiosRequestConfig & { _retry?: boolean }

export type TokenPair = { accessToken: string; refreshToken: string }

type SessionListeners = {
  onTokensRefreshed?: (tokens: TokenPair) => void
  onSessionExpired?: () => void
  onApiError?: (error: ApiError) => void
}

const AUTH_SKIP_REFRESH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/password-reset/request',
  '/api/v1/auth/password-reset/confirm',
]

let listeners: SessionListeners = {}
let refreshPromise: Promise<TokenPair | null> | null = null

/** Merge session listener callbacks. Omit a key to leave it unchanged; pass undefined to clear. */
export function setApiSessionListeners(patch: {
  onTokensRefreshed?: SessionListeners['onTokensRefreshed'] | null
  onSessionExpired?: SessionListeners['onSessionExpired'] | null
  onApiError?: SessionListeners['onApiError'] | null
}): void {
  if ('onTokensRefreshed' in patch) {
    listeners.onTokensRefreshed = patch.onTokensRefreshed ?? undefined
  }
  if ('onSessionExpired' in patch) {
    listeners.onSessionExpired = patch.onSessionExpired ?? undefined
  }
  if ('onApiError' in patch) {
    listeners.onApiError = patch.onApiError ?? undefined
  }
}

export function clearApiSessionListeners(): void {
  listeners = {}
}

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path))
}

/** Plain client without auth interceptors — used only for token refresh. */
function createRefreshClient() {
  return axios.create({
    baseURL: env.apiBaseUrl,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 30_000,
  })
}

async function refreshTokens(): Promise<TokenPair | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await createRefreshClient().post<TokenPair>(
      '/api/v1/auth/refresh',
      { refreshToken },
    )
    const tokens: TokenPair = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }
    tokenStorage.setTokens(tokens)
    listeners.onTokensRefreshed?.(tokens)
    return tokens
  } catch {
    tokenStorage.clearTokens()
    listeners.onSessionExpired?.()
    return null
  }
}

function queueRefresh(): Promise<TokenPair | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export function attachAuthInterceptors(client: import('axios').AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const accessToken = tokenStorage.getAccessToken()
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const deviceId = tokenStorage.getDeviceId()
    if (deviceId && !config.headers.has('x-device-id')) {
      config.headers.set('x-device-id', deviceId)
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined
      const status = error.response?.status
      const apiError = normalizeApiError(error)

      if (
        status === 401 &&
        original &&
        !original._retry &&
        !shouldSkipRefresh(original.url)
      ) {
        original._retry = true
        const tokens = await queueRefresh()
        if (tokens?.accessToken) {
          original.headers.set('Authorization', `Bearer ${tokens.accessToken}`)
          return client.request(original)
        }
      }

      const isAuthEndpoint401 =
        status === 401 && original && shouldSkipRefresh(original.url)

      if (!isAuthEndpoint401) {
        listeners.onApiError?.(apiError)
      }

      return Promise.reject(apiError)
    },
  )
}

export function isAxiosAuthError(error: unknown): error is AxiosError {
  return isAxiosError(error)
}
