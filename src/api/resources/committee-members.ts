/**
 * Committee members resource — REST foundation for Section X.
 */
import { customInstance } from '@/api/client'
import {
  mapCommitteeMemberDtoToViewModel,
  mapCreateInputToDto,
  mapDeactivateInputToDto,
  mapPaginatedCommitteeMembersToViewModel,
  mapUpdateInputToDto,
  type CommitteeMemberDto,
  type PaginatedCommitteeMembersDto,
} from '@/api/mappers/committee-members.mapper'
import type {
  CommitteeMemberListFilters,
  CommitteeMemberListResult,
  CommitteeMemberViewModel,
  CreateCommitteeMemberInput,
  DeactivateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
} from '@/models/committee-members'

const BASE = '/api/v1/committee-members'

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

function listParams(filters: CommitteeMemberListFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  }
  if (filters.centerId) params.centerId = filters.centerId
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.isActive !== undefined) params.isActive = filters.isActive
  return params
}

export async function listCommitteeMembers(
  filters: CommitteeMemberListFilters = {},
): Promise<CommitteeMemberListResult> {
  const dto = await customInstance<PaginatedCommitteeMembersDto>({
    url: BASE,
    method: 'GET',
    params: listParams(filters),
  })
  return mapPaginatedCommitteeMembersToViewModel(dto)
}

export async function getCommitteeMember(id: string): Promise<CommitteeMemberViewModel> {
  const dto = await customInstance<CommitteeMemberDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapCommitteeMemberDtoToViewModel(dto)
}

export async function createCommitteeMember(
  input: CreateCommitteeMemberInput,
): Promise<CommitteeMemberViewModel> {
  const dto = await customInstance<CommitteeMemberDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateInputToDto(input),
  })
  return mapCommitteeMemberDtoToViewModel(dto)
}

export async function updateCommitteeMember(
  id: string,
  input: UpdateCommitteeMemberInput,
): Promise<CommitteeMemberViewModel> {
  const dto = await customInstance<CommitteeMemberDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateInputToDto(input),
  })
  return mapCommitteeMemberDtoToViewModel(dto)
}

export async function deactivateCommitteeMember(
  id: string,
  input: DeactivateCommitteeMemberInput,
): Promise<CommitteeMemberViewModel> {
  const dto = await customInstance<CommitteeMemberDto>({
    url: `${BASE}/${id}/deactivate`,
    method: 'POST',
    data: mapDeactivateInputToDto(input),
  })
  return mapCommitteeMemberDtoToViewModel(dto)
}
