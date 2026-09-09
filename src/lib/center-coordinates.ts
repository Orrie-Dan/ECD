/** Finite WGS84 pair usable for map focus, or null when either axis is missing/invalid. */
export function toUsableCenterCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number; longitude: number } | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null
  }
  return { latitude, longitude }
}

/** True when a center has finite WGS84 coordinates usable for map focus. */
export function hasUsableCenterCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return toUsableCenterCoordinates(latitude, longitude) != null
}

/** Facility-level zoom for a single ECD center on the district map. */
export const ECD_CENTER_MAP_ZOOM = 16
