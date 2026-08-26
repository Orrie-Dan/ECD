/** Minimum scope for register list/summary API calls. */
export function hasRegisterListScope(filters: {
  centerId?: string
  districtId?: string
}): boolean {
  return Boolean(filters.centerId?.trim() || filters.districtId?.trim())
}
