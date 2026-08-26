import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { contributions, queryStaleTimes } from '@/api/query-keys'
import {
  archiveParentContribution,
  createParentContribution,
  fetchParentContributionSummary,
  getParentContribution,
  listParentContributions,
  updateParentContribution,
} from '@/api/resources/contributions'
import type {
  CreateParentContributionInput,
  ParentContributionListFilters,
  UpdateParentContributionInput,
} from '@/models/contributions'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: ParentContributionListFilters) {
  return contributions.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    contributionType: filters.contributionType ?? 'all',
  })
}

function summaryKey(
  filters: Pick<ParentContributionListFilters, 'centerId' | 'districtId' | 'from' | 'to'>,
) {
  return contributions.keys.summary({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
  })
}

export function useParentContributionsList(
  filters: ParentContributionListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listParentContributions(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.contributions,
  })
}

export function useParentContributionSummary(
  filters: Pick<ParentContributionListFilters, 'centerId' | 'districtId' | 'from' | 'to'>,
  enabled = true,
) {
  return useQuery({
    queryKey: summaryKey(filters),
    queryFn: () => fetchParentContributionSummary(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.contributions,
  })
}

export function useParentContributionDetail(id: string | undefined, enabled = true) {
  const contributionId = id?.trim() ?? ''
  return useQuery({
    queryKey: contributions.keys.detail(contributionId),
    queryFn: () => getParentContribution(contributionId),
    enabled: env.isLive && enabled && Boolean(contributionId),
    staleTime: queryStaleTimes.contributions,
  })
}

function invalidateContributionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: contributions.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: contributions.keys.detail(id) })
  }
}

export function useCreateParentContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateParentContributionInput) => createParentContribution(input),
    onSuccess: () => invalidateContributionQueries(queryClient),
  })
}

export function useUpdateParentContribution(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateParentContributionInput) =>
      updateParentContribution(id, input),
    onSuccess: () => invalidateContributionQueries(queryClient, id),
  })
}

export function useArchiveParentContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      archiveParentContribution(id, version),
    onSuccess: (_data, vars) => invalidateContributionQueries(queryClient, vars.id),
  })
}
