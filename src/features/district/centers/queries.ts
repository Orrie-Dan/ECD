/**
 * District-scoped ECD center directory — same contracts as NCDA centers list,
 * always filtered to the officer's districtId (never national hydration).
 */
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { fetchCentersTotal } from '@/api/resources/geo'
import {
  listCentersDirectory,
  type CenterListFilters,
} from '@/api/resources/centers'
import type { EcdCenterStatus } from '@/api/generated/models'

export type DistrictCentersListFilters = {
  districtId?: string
  search?: string
  status?: EcdCenterStatus
  page?: number
  pageSize?: number
}

export function useDistrictCentersList(
  filters: DistrictCentersListFilters = {},
  enabled = true,
) {
  const districtId = filters.districtId?.trim() || undefined
  const listFilters: CenterListFilters = {
    districtId,
    search: filters.search?.trim() || undefined,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: queryKeys.centersDirectory.list({
      ...listFilters,
      scope: 'district',
    } as Record<string, unknown>),
    queryFn: () => listCentersDirectory(listFilters),
    enabled: env.isLive && enabled && Boolean(districtId),
    staleTime: queryStaleTimes.reporting,
  })
}

/** Bounded network totals for the district Ibigo header (pageSize=1). */
export function useDistrictCentersNetwork(districtId: string | undefined, enabled = true) {
  const id = districtId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.centersDirectory.list({
      scope: 'district-network',
      districtId: id,
    } as Record<string, unknown>),
    queryFn: async () => {
      const [centers, activeCenters] = await Promise.all([
        fetchCentersTotal({ districtId: id }),
        fetchCentersTotal({ districtId: id, status: 'active' }),
      ])
      return { centers, activeCenters }
    },
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.reporting,
  })
}
