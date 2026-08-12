import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import { fetchReferralList } from '@/api/resources/referrals'
import type { ReferralListFilters } from '@/models/referral'

/**
 * District LIVE operational referrals — GET /api/v1/referrals.
 * Keep follow-up alerts (`GET /alerts/follow-up`) on a separate path.
 */
export function useDistrictReferralList(
  filters: ReferralListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: district.keys.referrals.list(filters),
    queryFn: () => fetchReferralList(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.referralList,
    retry: 0,
  })
}
