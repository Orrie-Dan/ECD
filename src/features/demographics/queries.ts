import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import { fetchChildrenDemographics } from '@/api/resources/children-demographics'
import type { ChildrenDemographicsFilters } from '@/models/children-demographics'

/** Active-child demographic drill-down for admin dashboards. */
export function useChildrenDemographics(
  filters: ChildrenDemographicsFilters = {},
  enabled = true,
) {
  const scoped: ChildrenDemographicsFilters = {
    districtId: filters.districtId?.trim() || undefined,
    centerId: filters.centerId?.trim() || undefined,
  }

  return useQuery({
    queryKey: ncda.keys.dashboard.childrenDemographics(scoped as Record<string, unknown>),
    queryFn: ({ signal }) => fetchChildrenDemographics(scoped, signal),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDashboard,
  })
}
