/**
 * NCDA Monitoring — national-safe aggregates + SQL-backed STED/compliance/WASH.
 * Does not call unsafe per-center monitoring tables at national scope.
 */
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  fetchMonitoringCompliance,
  fetchMonitoringDashboard,
  fetchMonitoringSted,
  fetchMonitoringWash,
} from '@/api/resources/monitoring'
import { fetchDistrictReport } from '@/api/resources/reporting'
import { fetchMonitoringAttendance } from '@/api/resources/monitoring'
import type { MonitoringDateFilters, MonitoringScopeFilters } from '@/models/monitoring'
import { listDistrictsPage } from '@/api/resources/geo'
import { listCentersPage } from '@/api/resources/centers'

export type NcdaMonitoringFilters = MonitoringDateFilters & {
  districtId?: string
}

export type NcdaMonitoringStedFilters = MonitoringScopeFilters

export function useNcdaMonitoringOverview(
  filters: NcdaMonitoringFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.overview(filters as Record<string, unknown>),
    queryFn: () =>
      fetchMonitoringDashboard({
        from: filters.from,
        to: filters.to,
        districtId: filters.districtId,
        centerId: filters.centerId,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringKpis(
  filters: NcdaMonitoringFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.kpis(filters as Record<string, unknown>),
    queryFn: () =>
      fetchDistrictReport({
        from: filters.from,
        to: filters.to,
        districtId: filters.districtId,
        centerId: filters.centerId,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringSted(
  filters: NcdaMonitoringStedFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.sted(filters as Record<string, unknown>),
    queryFn: () => fetchMonitoringSted(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringCompliance(
  filters: NcdaMonitoringFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.compliance(filters as Record<string, unknown>),
    queryFn: () =>
      fetchMonitoringCompliance({
        from: filters.from,
        to: filters.to,
        districtId: filters.districtId,
        centerId: filters.centerId,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringWash(
  filters: NcdaMonitoringFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.wash(filters as Record<string, unknown>),
    queryFn: () =>
      fetchMonitoringWash({
        from: filters.from,
        to: filters.to,
        districtId: filters.districtId,
        centerId: filters.centerId,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.monitoring.overview({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringCenterOptions(
  districtId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.overview({ centerOptions: true, districtId }),
    queryFn: () =>
      listCentersPage({
        districtId: districtId && districtId !== 'all' ? districtId : undefined,
        page: 1,
        pageSize: 200,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

export function useNcdaMonitoringAttendance(
  filters: NcdaMonitoringFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.overview({ attendance: true, ...filters as Record<string, unknown> }),
    queryFn: () =>
      fetchMonitoringAttendance({
        from: filters.from,
        to: filters.to,
        districtId: filters.districtId,
        centerId: filters.centerId,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaMonitoring,
  })
}

/** Surfaces still unsupported after Sprint 5.5I contract completion. */
export const NCDA_MONITORING_UNAVAILABLE = [
  {
    id: 'per-center-monitoring-tables',
    reason: 'Per-center monitoring tables are not shown at national scope',
  },
  {
    id: 'time-series-trends',
    reason: 'Time-series trends are not available in this view',
  },
] as const
