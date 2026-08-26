import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { centerSupport, queryStaleTimes } from '@/api/query-keys'
import {
  createCenterSupport,
  getCenterSupport,
  listCenterSupport,
  updateCenterSupport,
} from '@/api/resources/center-support'
import type {
  CenterSupportListFilters,
  CreateCenterSupportInput,
  UpdateCenterSupportInput,
} from '@/models/center-support'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: CenterSupportListFilters) {
  return centerSupport.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    supportCategory: filters.supportCategory ?? 'all',
  })
}

export function useCenterSupportList(filters: CenterSupportListFilters, enabled = true) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listCenterSupport(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.centerSupport,
  })
}

export function useCenterSupportDetail(id: string | undefined, enabled = true) {
  const supportId = id?.trim() ?? ''
  return useQuery({
    queryKey: centerSupport.keys.detail(supportId),
    queryFn: () => getCenterSupport(supportId),
    enabled: env.isLive && enabled && Boolean(supportId),
    staleTime: queryStaleTimes.centerSupport,
  })
}

function invalidateSupportQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: centerSupport.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: centerSupport.keys.detail(id) })
  }
}

export function useCreateCenterSupport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCenterSupportInput) => createCenterSupport(input),
    onSuccess: () => invalidateSupportQueries(queryClient),
  })
}

export function useUpdateCenterSupport(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCenterSupportInput) => updateCenterSupport(id, input),
    onSuccess: () => invalidateSupportQueries(queryClient, id),
  })
}
