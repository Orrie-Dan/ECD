import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { getCenterDirectoryItem, listCentersDirectory } from '@/api/resources/centers'

export function useCentersDirectory(
  params: { districtId?: string; search?: string; page?: number; pageSize?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.centersDirectory.list(params),
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
