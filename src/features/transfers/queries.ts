import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryStaleTimes, transfers } from '@/api/query-keys'
import {
  fetchCenterTransferHistory,
  type CenterTransferHistoryFilters,
} from '@/api/resources/transfers'

/** LIVE ECD center transfer timeline — GET /api/v1/centers/{id}/transfer-history */
export function useCenterTransferHistory(
  centerId: string | undefined,
  filters: CenterTransferHistoryFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: transfers.keys.history(centerId ?? '', filters),
    queryFn: () => {
      if (!centerId) throw new Error('Center id required')
      return fetchCenterTransferHistory(centerId, filters)
    },
    enabled: env.isLive && enabled && Boolean(centerId),
    staleTime: queryStaleTimes.centerTransferHistory,
  })
}
