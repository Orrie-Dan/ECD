/**
 * District Incamake GIS — bounded geo reads for the assigned district.
 * Never lists other districts; never hydrates a national center set.
 */
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import { getDistrict, listAdminUnits } from '@/api/resources/geo'
import { listCentersDirectory, type CenterListFilters } from '@/api/resources/centers'
import type { AdministrativeLevel, EcdCenterStatus } from '@/api/generated/models'

export function useDistrictIdentity(districtId: string | undefined, enabled = true) {
  const id = districtId?.trim() ?? ''
  return useQuery({
    queryKey: district.keys.overview.identity(id),
    queryFn: () => getDistrict(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.districtOverview,
  })
}

export function useDistrictOverviewAdminUnits(
  params: { districtId?: string; parentId?: string; level?: AdministrativeLevel },
  enabled = true,
) {
  const districtId = params.districtId?.trim() ?? ''
  return useQuery({
    queryKey: district.keys.overview.adminUnits(params as Record<string, unknown>),
    queryFn: () =>
      listAdminUnits({
        districtId: districtId || undefined,
        parentId: params.parentId,
        level: params.level,
      }),
    enabled: env.isLive && enabled && Boolean(districtId || params.parentId),
    staleTime: queryStaleTimes.districtOverview,
  })
}

export function useDistrictOverviewCenters(
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
    queryKey: district.keys.overview.centers(listFilters as Record<string, unknown>),
    queryFn: () => listCentersDirectory(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.districtOverview,
  })
}
