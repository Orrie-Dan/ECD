import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  fetchCentersTotal,
  listDistrictsPage,
} from '@/api/resources/geo'
import {
  getCenterDetail,
  listCentersPage,
  type CenterListFilters,
} from '@/api/resources/centers'
import { fetchChildrenList } from '@/api/resources/children'
import { fetchAttendanceList } from '@/api/resources/attendance'
import { fetchNutritionScreeningList } from '@/api/resources/nutrition'
import { fetchFeedingDayList } from '@/api/resources/feeding'
import { fetchReferralList } from '@/api/resources/referrals'
import { fetchMonitoringDashboard } from '@/api/resources/monitoring'
import type { MonitoringDateFilters } from '@/models/monitoring'
import type { EcdCenterStatus } from '@/api/generated/models'

export type NcdaCenterListFilters = CenterListFilters

/** Paginated national center directory — server-side search / district / status / page. */
export function useNcdaCentersList(
  filters: NcdaCenterListFilters = {},
  enabled = true,
) {
  const listFilters: CenterListFilters = {
    search: filters.search?.trim() || undefined,
    districtId: filters.districtId,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.centers.list(listFilters as Record<string, unknown>),
    queryFn: () => listCentersPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

/** Bounded network totals for the centers page header (pageSize=1). */
export function useNcdaCentersNetwork(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.centers.network({}),
    queryFn: async () => {
      const [centers, activeCenters] = await Promise.all([
        fetchCentersTotal(),
        fetchCentersTotal({ status: 'active' }),
      ])
      return { centers, activeCenters }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

/**
 * District options for the national center filter — Rwanda has ≤100 districts,
 * so a single pageSize=100 call is safe (not national center hydration).
 */
export function useNcdaCenterDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.centers.network({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

/** Single center identity — GET /centers/:id. */
export function useNcdaCenterDetail(centerId: string | undefined, enabled = true) {
  const id = centerId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.centers.detail(id),
    queryFn: () => getCenterDetail(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

/**
 * Center-scoped operational summary — analytics dashboard only.
 * Never fans out per-child or national operational lists.
 */
export function useNcdaCenterSummary(
  centerId: string | undefined,
  dateFilters: Pick<MonitoringDateFilters, 'from' | 'to'> = {},
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = {
    centerId: id,
    from: dateFilters.from,
    to: dateFilters.to,
  }
  return useQuery({
    queryKey: ncda.keys.centers.summary(id, filters as Record<string, unknown>),
    queryFn: () =>
      fetchMonitoringDashboard({
        centerId: id,
        from: dateFilters.from,
        to: dateFilters.to,
      }),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export function useNcdaCenterChildren(
  centerId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = { centerId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.centers.children(id, filters),
    queryFn: () => fetchChildrenList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export function useNcdaCenterAttendance(
  centerId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = { centerId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.centers.attendance(id, filters),
    queryFn: () => fetchAttendanceList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export function useNcdaCenterNutrition(
  centerId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = { centerId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.centers.nutrition(id, filters),
    queryFn: () => fetchNutritionScreeningList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export function useNcdaCenterFeeding(
  centerId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = { centerId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.centers.feeding(id, filters),
    queryFn: () => fetchFeedingDayList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export function useNcdaCenterReferrals(
  centerId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = centerId?.trim() ?? ''
  const filters = { centerId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.centers.referrals(id, filters),
    queryFn: () => fetchReferralList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCenters,
  })
}

export type NcdaCenterStatusFilter = EcdCenterStatus
