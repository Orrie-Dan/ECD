import { useAuth } from '@/contexts/AppContext'
import { useDistrictIdentity } from '@/features/district/overview/queries'

/**
 * Assigned-district identity for the authenticated district officer.
 * Relies on JWT `districtId`; name is resolved from GET /districts/:id when LIVE.
 */
export function useDistrictScope() {
  const { user } = useAuth()
  const districtId = user?.districtId?.trim() || undefined
  const identity = useDistrictIdentity(districtId, Boolean(districtId))

  return {
    districtId: districtId ?? null,
    districtName:
      user?.districtName?.trim() ||
      identity.data?.name?.trim() ||
      null,
    isLoading: Boolean(districtId) && identity.isLoading,
    isError: identity.isError,
    refetch: identity.refetch,
  }
}
