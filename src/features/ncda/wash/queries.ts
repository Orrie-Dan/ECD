import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  getWashIndicator,
  listWashIndicatorsPage,
  type WashIndicatorsListFilters,
} from '@/api/resources/wash'
import { listDistrictsPage, listCentersByDistrictPage } from '@/api/resources/geo'

export type NcdaWashListFilters = WashIndicatorsListFilters

export function useNcdaWashIndicators(filters: NcdaWashListFilters = {}, enabled = true) {
  const listFilters: WashIndicatorsListFilters = {
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.wash.list(listFilters as Record<string, unknown>),
    queryFn: () => listWashIndicatorsPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaWash,
  })
}

export function useNcdaWashIndicatorDetail(indicatorId: string | undefined, enabled = true) {
  const id = indicatorId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.wash.detail(id),
    queryFn: () => getWashIndicator(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaWash,
  })
}

export function useNcdaWashDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.wash.list({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaWash,
  })
}

export function useNcdaWashCenterOptions(
  districtId: string | undefined,
  search?: string,
  enabled = true,
) {
  const id = districtId?.trim() ?? ''
  const q = search?.trim() || undefined
  return useQuery({
    queryKey: ncda.keys.wash.list({ centerOptions: id, search: q }),
    queryFn: () =>
      listCentersByDistrictPage({
        districtId: id,
        search: q,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaWash,
  })
}
