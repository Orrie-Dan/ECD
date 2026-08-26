import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { parentingSessions, queryStaleTimes } from '@/api/query-keys'
import {
  createParentingSession,
  fetchParentingSessionsAttendanceSummary,
  getParentingSession,
  listParentingSessions,
  updateParentingSession,
} from '@/api/resources/parenting-sessions'
import type {
  CreateParentingSessionInput,
  ParentingSessionListFilters,
  UpdateParentingSessionInput,
} from '@/models/parenting-sessions'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: ParentingSessionListFilters) {
  return parentingSessions.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
}

function summaryKey(
  filters: Pick<ParentingSessionListFilters, 'centerId' | 'districtId' | 'from' | 'to'>,
) {
  return parentingSessions.keys.summary({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
  })
}

export function useParentingSessionsList(
  filters: ParentingSessionListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listParentingSessions(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.parentingSessions,
  })
}

export function useParentingSessionsAttendanceSummary(
  filters: Pick<ParentingSessionListFilters, 'centerId' | 'districtId' | 'from' | 'to'>,
  enabled = true,
) {
  return useQuery({
    queryKey: summaryKey(filters),
    queryFn: () => fetchParentingSessionsAttendanceSummary(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.parentingSessions,
  })
}

export function useParentingSessionDetail(id: string | undefined, enabled = true) {
  const sessionId = id?.trim() ?? ''
  return useQuery({
    queryKey: parentingSessions.keys.detail(sessionId),
    queryFn: () => getParentingSession(sessionId),
    enabled: env.isLive && enabled && Boolean(sessionId),
    staleTime: queryStaleTimes.parentingSessions,
  })
}

function invalidateParentingSessionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: parentingSessions.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: parentingSessions.keys.detail(id) })
  }
}

export function useCreateParentingSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateParentingSessionInput) => createParentingSession(input),
    onSuccess: () => invalidateParentingSessionQueries(queryClient),
  })
}

export function useUpdateParentingSession(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateParentingSessionInput) => updateParentingSession(id, input),
    onSuccess: () => invalidateParentingSessionQueries(queryClient, id),
  })
}
