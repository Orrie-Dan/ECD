import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { committeeMembers, queryStaleTimes } from '@/api/query-keys'
import {
  createCommitteeMember,
  deactivateCommitteeMember,
  getCommitteeMember,
  listCommitteeMembers,
  updateCommitteeMember,
} from '@/api/resources/committee-members'
import type {
  CommitteeMemberListFilters,
  CreateCommitteeMemberInput,
  DeactivateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
} from '@/models/committee-members'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: CommitteeMemberListFilters) {
  return committeeMembers.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    isActive: filters.isActive,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
}

export function useCommitteeMembersList(
  filters: CommitteeMemberListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listCommitteeMembers(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.committeeMembers,
  })
}

export function useCommitteeMemberDetail(id: string | undefined, enabled = true) {
  const memberId = id?.trim() ?? ''
  return useQuery({
    queryKey: committeeMembers.keys.detail(memberId),
    queryFn: () => getCommitteeMember(memberId),
    enabled: env.isLive && enabled && Boolean(memberId),
    staleTime: queryStaleTimes.committeeMembers,
  })
}

function invalidateCommitteeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: committeeMembers.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: committeeMembers.keys.detail(id) })
  }
}

export function useCreateCommitteeMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommitteeMemberInput) => createCommitteeMember(input),
    onSuccess: () => invalidateCommitteeQueries(queryClient),
  })
}

export function useUpdateCommitteeMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCommitteeMemberInput) => updateCommitteeMember(id, input),
    onSuccess: () => invalidateCommitteeQueries(queryClient, id),
  })
}

export function useDeactivateCommitteeMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: DeactivateCommitteeMemberInput
    }) => deactivateCommitteeMember(id, input),
    onSuccess: (_data, vars) => invalidateCommitteeQueries(queryClient, vars.id),
  })
}
