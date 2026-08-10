/**
 * Runtime environment for API infrastructure.
 * MOCK keeps the existing mock UI data paths;
 * LIVE enables the Axios client against the Nest API.
 */
export type ApiMode = 'mock' | 'live'

function readApiMode(raw: string | undefined): ApiMode {
  if (raw === 'live' || raw === 'mock') return raw
  return 'mock'
}

export const env = {
  /** `mock` (default) | `live` */
  apiMode: readApiMode(import.meta.env.VITE_API_MODE),
  /** Nest API origin, no trailing slash. Paths already include `/api/v1/...`. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
    ?? 'http://localhost:3000',
  get isMock(): boolean {
    return this.apiMode === 'mock'
  },
  get isLive(): boolean {
    return this.apiMode === 'live'
  },
} as const

export type Env = typeof env
