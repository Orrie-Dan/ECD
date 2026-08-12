import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  fetchChildrenList,
  fetchChildrenTotal,
  fetchChildDetail,
} from '@/api/resources/children'
import { listDistrictsPage, listCentersByDistrictPage } from '@/api/resources/geo'
import { fetchAttendanceList } from '@/api/resources/attendance'
import { fetchNutritionScreeningList } from '@/api/resources/nutrition'
import { fetchChildStedHistory } from '@/api/resources/sted'
import { fetchReferralList } from '@/api/resources/referrals'
import type { ChildrenListFilters } from '@/models/child'
import type { ChildStatus } from '@/types'

export type NcdaChildListFilters = ChildrenListFilters

/** Paginated national child directory — server-side search / district / center / status. */
export function useNcdaChildrenList(
  filters: NcdaChildListFilters = {},
  enabled = true,
) {
  const listFilters: ChildrenListFilters = {
    search: filters.search?.trim() || undefined,
    districtId: filters.districtId,
    centerId: filters.centerId,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.children.list(listFilters as Record<string, unknown>),
    queryFn: () => fetchChildrenList(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

/** Bounded network totals for the children page header (pageSize=1). */
export function useNcdaChildrenNetwork(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.children.network({}),
    queryFn: async () => {
      const [children, activeChildren] = await Promise.all([
        fetchChildrenTotal(),
        fetchChildrenTotal({ status: 'active' }),
      ])
      return { children, activeChildren }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

/** District options for filters — ≤100 districts; not child hydration. */
export function useNcdaChildDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.children.network({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

/**
 * Center options scoped to a district — server-paginated GET /centers?districtId=.
 * Disabled until a district is selected (avoids national center download).
 */
export function useNcdaChildCenterOptions(
  districtId: string | undefined,
  search?: string,
  enabled = true,
) {
  const id = districtId?.trim() ?? ''
  const q = search?.trim() || undefined
  return useQuery({
    queryKey: ncda.keys.children.network({ centerOptions: id, search: q }),
    queryFn: () =>
      listCentersByDistrictPage({
        districtId: id,
        search: q,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

/** Single child identity — GET /children/:id. */
export function useNcdaChildDetail(childId: string | undefined, enabled = true) {
  const id = childId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.children.detail(id),
    queryFn: () => fetchChildDetail(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

export function useNcdaChildAttendance(
  childId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = childId?.trim() ?? ''
  const filters = { childId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.children.attendance(id, filters),
    queryFn: () => fetchAttendanceList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

export function useNcdaChildNutrition(
  childId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = childId?.trim() ?? ''
  const filters = { childId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.children.nutrition(id, filters),
    queryFn: () => fetchNutritionScreeningList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

export function useNcdaChildSted(
  childId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = childId?.trim() ?? ''
  const filters = { page, pageSize }
  return useQuery({
    queryKey: ncda.keys.children.sted(id, filters),
    queryFn: () => fetchChildStedHistory(id, filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

export function useNcdaChildReferrals(
  childId: string | undefined,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  const id = childId?.trim() ?? ''
  const filters = { childId: id, page, pageSize }
  return useQuery({
    queryKey: ncda.keys.children.referrals(id, filters),
    queryFn: () => fetchReferralList(filters),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaChildren,
  })
}

export type NcdaChildStatusFilter = ChildStatus
