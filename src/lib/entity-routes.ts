import { isUuidLike } from '@/lib/child-routes'

export type CenterRouteLike = {
  id?: string | null
  code?: string | null
}

export type DistrictRouteLike = {
  id?: string | null
  code?: string | null
}

/**
 * Prefer stable business `code` in user-facing URLs.
 * Fall back to UUID only when code is unavailable (compat / incomplete payloads).
 */
export function centerRouteKey(center: CenterRouteLike): string | null {
  const code = center.code?.trim()
  if (code) return code
  const id = center.id?.trim()
  return id || null
}

export function districtRouteKey(district: DistrictRouteLike): string | null {
  const code = district.code?.trim()
  if (code) return code
  const id = district.id?.trim()
  return id || null
}

export function buildCenterDetailPath(basePath: string, center: CenterRouteLike): string {
  const key = centerRouteKey(center)
  if (!key) return basePath
  return `${basePath}/${encodeURIComponent(key)}`
}

export function buildDistrictDetailPath(basePath: string, district: DistrictRouteLike): string {
  const key = districtRouteKey(district)
  if (!key) return basePath
  return `${basePath}/${encodeURIComponent(key)}`
}

/** Never render a raw UUID as a human label (breadcrumbs, fallbacks, headers). */
export function displayEntityLabel(
  name: string | null | undefined,
  fallback = '—',
): string {
  const trimmed = name?.trim()
  if (!trimmed) return fallback
  if (isUuidLike(trimmed)) return fallback
  return trimmed
}

export function decodeRouteParam(value: string | undefined | null): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}
