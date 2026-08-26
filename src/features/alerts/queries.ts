import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import {
  fetchFollowUpAlerts,
  type FollowUpAlertsFilters,
} from '@/api/resources/alerts'
import { buildMockFollowUpAlerts } from '@/lib/mock-follow-up-alerts'

/** District / caretaker follow-up alerts — LIVE API or MOCK computation. */
export function useFollowUpAlerts(filters: FollowUpAlertsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: district.keys.alerts(filters as Record<string, unknown>),
    queryFn: () =>
      env.isLive ? fetchFollowUpAlerts(filters) : buildMockFollowUpAlerts(filters),
    enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}
