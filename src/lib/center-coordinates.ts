/** True when a center has finite WGS84 coordinates usable for map focus. */
export function hasUsableCenterCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

/** Facility-level zoom for a single ECD center on the district map. */
export const ECD_CENTER_MAP_ZOOM = 16
