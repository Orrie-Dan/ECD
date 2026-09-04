import { DISTRICT_PATHS } from '@/layouts/district/navigation'

/** District map URL focused on a specific ECD center (prefer business code). */
export function buildDistrictMapCenterHref(center: {
  id?: string | null
  code?: string | null
}): string {
  const key = center.code?.trim() || center.id?.trim()
  if (!key) return DISTRICT_PATHS.gis
  const params = new URLSearchParams(
    center.code?.trim() ? { center: center.code.trim() } : { centerId: key },
  )
  return `${DISTRICT_PATHS.gis}?${params.toString()}`
}
