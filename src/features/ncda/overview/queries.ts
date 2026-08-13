/**
 * NCDA Overview GIS — bounded geo reads for the national command centre.
 * Never hydrates the national center set; district drill-down uses pageSize ≤ 100.
 */
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import { listAdminUnits, listDistrictsPage } from '@/api/resources/geo'
import { listCentersDirectory, type CenterListFilters } from '@/api/resources/centers'
import type { AdministrativeLevel, EcdCenterStatus } from '@/api/generated/models'

export function useNcdaOverviewDistricts(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.districts.list({ overview: true, pageSize: 100 }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

export function useNcdaOverviewAdminUnits(
  params: { districtId?: string; parentId?: string; level?: AdministrativeLevel },
  enabled = true,
) {
  const districtId = params.districtId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.districts.adminUnits(params as Record<string, unknown>),
    queryFn: () =>
      listAdminUnits({
        districtId: districtId || undefined,
        parentId: params.parentId,
        level: params.level,
      }),
    enabled: env.isLive && enabled && Boolean(districtId || params.parentId),
    staleTime: queryStaleTimes.ncdaDistricts,
  })
}

export function useNcdaOverviewCenters(
  filters: {
    search?: string
    districtId?: string
    status?: EcdCenterStatus
    page?: number
    pageSize?: number
  },
  enabled = true,
) {
  const listFilters: CenterListFilters = {
    search: filters.search?.trim() || undefined,
    districtId: filters.districtId,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 100,
  }
  return useQuery({
    queryKey: ncda.keys.centers.list({ ...listFilters, overview: true } as Record<string, unknown>),
    queryFn: () => listCentersDirectory(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCenters,
  })
}
