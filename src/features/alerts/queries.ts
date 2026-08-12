import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import {
  fetchFollowUpAlerts,
  type FollowUpAlertsFilters,
} from '@/api/resources/alerts'

/** LIVE District follow-up alerts — GET only. */
export function useFollowUpAlerts(filters: FollowUpAlertsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: district.keys.alerts(filters as Record<string, unknown>),
    queryFn: () => fetchFollowUpAlerts(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}
