import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import { fetchChildDetail, fetchChildrenList } from '@/api/resources/children'
import type { ChildrenListFilters } from '@/models/child'

/**
 * District LIVE hooks must not depend on caregiver offline store or DataProvider.
 * They call the backend APIs directly via the district-facing resources layer.
 * Query keys use the district namespace to avoid colliding with caregiver LocalStore caches.
 */

export function useDistrictChildrenList(filters: ChildrenListFilters, enabled = true) {
  return useQuery({
    queryKey: district.keys.children('list', filters),
    queryFn: () => fetchChildrenList(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.childrenList,
    retry: 0,
  })
}

export function useDistrictChildDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: district.keys.child(id ?? ''),
    queryFn: async () => fetchChildDetail(id!),
    enabled: env.isLive && enabled && !!id,
    staleTime: queryStaleTimes.childrenDetail,
    retry: 0,
  })
}

