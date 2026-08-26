import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { centerVisits, queryStaleTimes } from '@/api/query-keys'
import {
  createCenterVisit,
  getCenterVisit,
  listCenterVisits,
  updateCenterVisit,
} from '@/api/resources/center-visits'
import type {
  CenterVisitListFilters,
  CreateCenterVisitInput,
  UpdateCenterVisitInput,
} from '@/models/center-visits'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: CenterVisitListFilters) {
  return centerVisits.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
}

export function useCenterVisitsList(filters: CenterVisitListFilters, enabled = true) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listCenterVisits(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.centerVisits,
  })
}

export function useCenterVisitDetail(id: string | undefined, enabled = true) {
  const visitId = id?.trim() ?? ''
  return useQuery({
    queryKey: centerVisits.keys.detail(visitId),
    queryFn: () => getCenterVisit(visitId),
    enabled: env.isLive && enabled && Boolean(visitId),
    staleTime: queryStaleTimes.centerVisits,
  })
}

function invalidateVisitQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: centerVisits.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: centerVisits.keys.detail(id) })
  }
}

export function useCreateCenterVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCenterVisitInput) => createCenterVisit(input),
    onSuccess: () => invalidateVisitQueries(queryClient),
  })
}

export function useUpdateCenterVisit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCenterVisitInput) => updateCenterVisit(id, input),
    onSuccess: () => invalidateVisitQueries(queryClient, id),
  })
}
