import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { getCenterDirectoryItem, listCentersDirectory } from '@/api/resources/centers'
import type { EcdCenterStatus } from '@/api/generated/models'

export function useCentersDirectory(
  params: {
    districtId?: string
    search?: string
    status?: EcdCenterStatus
    page?: number
    pageSize?: number
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.centersDirectory.list(params as Record<string, unknown>),
    queryFn: () => listCentersDirectory(params),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.reporting,
  })
}

export function useCenterDirectoryItem(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.centersDirectory.detail(id ?? ''),
    queryFn: () => getCenterDirectoryItem(id!),
    enabled: env.isLive && enabled && !!id,
    staleTime: queryStaleTimes.reporting,
  })
}
