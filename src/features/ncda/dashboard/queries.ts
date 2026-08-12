import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import { fetchMonitoringDashboard } from '@/api/resources/monitoring'
import { fetchDistrictReport } from '@/api/resources/reporting'
import { fetchCentersTotal, fetchDistrictsTotal } from '@/api/resources/geo'
import type { MonitoringDateFilters } from '@/models/monitoring'
import type { ReportingScopeFilters } from '@/models/reporting'

export type NcdaDashboardDateFilters = Pick<MonitoringDateFilters, 'from' | 'to'>

/** Analytics dashboard KPIs — national when districtId/centerId omitted. */
export function useNcdaDashboardOverview(
  filters: NcdaDashboardDateFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.dashboard.overview(filters as Record<string, unknown>),
    queryFn: () => fetchMonitoringDashboard(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDashboard,
  })
}

/**
 * District-report KPI rollup (also valid at national scope for ncda_admin).
 * Supplies newRegistrations, dropouts, stedAssessments counts.
 */
export function useNcdaDashboardKpis(
  filters: ReportingScopeFilters = {},
  enabled = true,
) {
  const dateFilters: ReportingScopeFilters = {
    from: filters.from,
    to: filters.to,
  }
  return useQuery({
    queryKey: ncda.keys.dashboard.kpis(dateFilters as Record<string, unknown>),
    queryFn: () => fetchDistrictReport(dateFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDashboard,
  })
}

/** Network directory totals — pageSize=1 + `total` only. */
export function useNcdaDashboardNetwork(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.dashboard.network({}),
    queryFn: async () => {
      const [districts, activeCenters] = await Promise.all([
        fetchDistrictsTotal(),
        fetchCentersTotal({ status: 'active' }),
      ])
      return { districts, activeCenters }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDashboard,
  })
}
