import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  fetchCentersTotal,
  fetchDistrictsTotal,
  getDistrict,
  listCentersByDistrictPage,
  listDistrictsPage,
  type DistrictCenterListFilters,
  type DistrictListFilters,
} from '@/api/resources/geo'
import { fetchMonitoringDashboard } from '@/api/resources/monitoring'
import { fetchDistrictReport } from '@/api/resources/reporting'
import type { MonitoringDateFilters } from '@/models/monitoring'
import type { ReportingScopeFilters } from '@/models/reporting'

export type NcdaDistrictListFilters = DistrictListFilters

export type NcdaDistrictCenterFilters = Omit<DistrictCenterListFilters, 'districtId'> & {
  districtId: string
}

/** Paginated national district directory — server-side search / isActive / page. */
export function useNcdaDistrictsList(
  filters: NcdaDistrictListFilters = {},
  enabled = true,
) {
  const listFilters: DistrictListFilters = {
    search: filters.search?.trim() || undefined,
    isActive: filters.isActive,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.districts.list(listFilters as Record<string, unknown>),
    queryFn: () => listDistrictsPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

/** Unfiltered network totals for the districts page header (pageSize=1). */
export function useNcdaDistrictsNetwork(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.districts.network({}),
    queryFn: async () => {
      const [districts, activeDistricts] = await Promise.all([
        fetchDistrictsTotal(),
        fetchDistrictsTotal({ isActive: true }),
      ])
      return { districts, activeDistricts }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

/** Single district identity — GET /districts/:id. */
export function useNcdaDistrictDetail(districtId: string | undefined, enabled = true) {
  const id = districtId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.districts.detail(id),
    queryFn: () => getDistrict(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

/**
 * District-scoped operational summary — analytics dashboard + district report KPIs
 * + bounded center totals. Never fans out per-center queries.
 */
export function useNcdaDistrictSummary(
  districtId: string | undefined,
  dateFilters: Pick<MonitoringDateFilters, 'from' | 'to'> = {},
  enabled = true,
) {
  const id = districtId?.trim() ?? ''
  const filters = {
    districtId: id,
    from: dateFilters.from,
    to: dateFilters.to,
  }
  return useQuery({
    queryKey: ncda.keys.districts.summary(id, filters as Record<string, unknown>),
    queryFn: async () => {
      const scope: ReportingScopeFilters = {
        districtId: id,
        from: dateFilters.from,
        to: dateFilters.to,
      }
      const dashFilters: MonitoringDateFilters = {
        districtId: id,
        from: dateFilters.from,
        to: dateFilters.to,
      }
      const [overview, kpis, centersTotal, activeCenters] = await Promise.all([
        fetchMonitoringDashboard(dashFilters),
        fetchDistrictReport(scope),
        fetchCentersTotal({ districtId: id }),
        fetchCentersTotal({ districtId: id, status: 'active' }),
      ])
      return { overview, kpis, centersTotal, activeCenters }
    },
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

/** Server-paginated centers for one district — GET /centers?districtId=. */
export function useNcdaDistrictCenters(
  filters: NcdaDistrictCenterFilters,
  enabled = true,
) {
  const districtId = filters.districtId?.trim() ?? ''
  const centerFilters: DistrictCenterListFilters = {
    districtId,
    search: filters.search?.trim() || undefined,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.districts.centers(
      districtId,
      centerFilters as unknown as Record<string, unknown>,
    ),
    queryFn: () => listCentersByDistrictPage(centerFilters),
    enabled: env.isLive && enabled && Boolean(districtId),
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}
