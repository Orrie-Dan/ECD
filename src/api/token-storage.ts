const ACCESS_TOKEN_KEY = 'ecd_access_token'
const REFRESH_TOKEN_KEY = 'ecd_refresh_token'
const DEVICE_ID_KEY = 'ecd_device_id'

export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  getTokens(): StoredTokens | null {
    const accessToken = this.getAccessToken()
    const refreshToken = this.getRefreshToken()
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
  },

  setTokens(tokens: StoredTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  /** Device registry UUID for `x-device-id` on mutating routes. */
  getDeviceId(): string | null {
    return localStorage.getItem(DEVICE_ID_KEY)
  },

  setDeviceId(deviceId: string): void {
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  },

  clearDeviceId(): void {
    localStorage.removeItem(DEVICE_ID_KEY)
  },

  clearAll(): void {
    this.clearTokens()
    this.clearDeviceId()
  },
}
