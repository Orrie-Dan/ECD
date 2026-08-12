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

function readApiBaseUrl(raw: string | undefined): string {
  return raw?.replace(/\/$/, '') || 'http://localhost:3000'
}

export const env = {
  /** `mock` (default) | `live` */
  apiMode: readApiMode(import.meta.env.VITE_API_MODE),
  /** Nest API origin, no trailing slash. Paths already include `/api/v1/...`. */
  apiBaseUrl: readApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined),
  get isMock(): boolean {
    return this.apiMode === 'mock'
  },
  get isLive(): boolean {
    return this.apiMode === 'live'
  },
  /** Production build without LIVE API config — mock login must not run. */
  get isProductionMock(): boolean {
    return import.meta.env.PROD && this.isMock
  },
} as const

/** True when a production LIVE build is still pointed at a local API origin. */
export function isUnsafeProductionApiBaseUrl(baseUrl: string = env.apiBaseUrl): boolean {
  try {
    const host = new URL(baseUrl).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return true
  }
}

if (import.meta.env.PROD && env.isLive && isUnsafeProductionApiBaseUrl()) {
  console.error(
    '[ECD] Production LIVE build requires a non-localhost VITE_API_BASE_URL. Current value points at a local origin.',
  )
}

export type Env = typeof env
