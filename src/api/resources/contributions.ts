/**
 * Parent contributions resource — REST foundation for Section VIII.
 * OpenAPI Orval client not yet generated for this domain; uses customInstance.
 */
import { customInstance } from '@/api/client'
import {
  mapCreateInputToDto,
  mapPaginatedParentContributionsToViewModel,
  mapParentContributionDtoToViewModel,
  mapParentContributionSummaryToViewModel,
  mapUpdateInputToDto,
  type PaginatedParentContributionsDto,
  type ParentContributionDto,
  type ParentContributionSummaryDto,
} from '@/api/mappers/contributions.mapper'
import type {
  CreateParentContributionInput,
  ParentContributionListFilters,
  ParentContributionListResult,
  ParentContributionSummaryViewModel,
  ParentContributionViewModel,
  UpdateParentContributionInput,
} from '@/models/contributions'

const BASE = '/api/v1/contributions'

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

function listParams(filters: ParentContributionListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  }
  if (filters.centerId) params.centerId = filters.centerId
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  return params
}

export async function listParentContributions(
  filters: ParentContributionListFilters = {},
): Promise<ParentContributionListResult> {
  const dto = await customInstance<PaginatedParentContributionsDto>({
    url: BASE,
    method: 'GET',
    params: listParams(filters),
  })
  const result = mapPaginatedParentContributionsToViewModel(dto)

  // API list has no contributionType query — filter the current page client-side.
  if (filters.contributionType && filters.contributionType !== 'all') {
    const items = result.items.filter(
      (item) => item.contributionType === filters.contributionType,
    )
    return { ...result, items }
  }
  return result
}

export async function fetchParentContributionSummary(
  filters: Pick<ParentContributionListFilters, 'centerId' | 'districtId' | 'from' | 'to'> = {},
): Promise<ParentContributionSummaryViewModel> {
  const params: Record<string, string> = {}
  if (filters.centerId) params.centerId = filters.centerId
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to

  const dto = await customInstance<ParentContributionSummaryDto>({
    url: `${BASE}/summary`,
    method: 'GET',
    params,
  })
  return mapParentContributionSummaryToViewModel(dto)
}

export async function getParentContribution(
  id: string,
): Promise<ParentContributionViewModel> {
  const dto = await customInstance<ParentContributionDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapParentContributionDtoToViewModel(dto)
}

export async function createParentContribution(
  input: CreateParentContributionInput,
): Promise<ParentContributionViewModel> {
  const dto = await customInstance<ParentContributionDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateInputToDto(input),
  })
  return mapParentContributionDtoToViewModel(dto)
}

export async function updateParentContribution(
  id: string,
  input: UpdateParentContributionInput,
): Promise<ParentContributionViewModel> {
  const dto = await customInstance<ParentContributionDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateInputToDto(input),
  })
  return mapParentContributionDtoToViewModel(dto)
}

export async function archiveParentContribution(
  id: string,
  version: number,
): Promise<void> {
  await customInstance<void>({
    url: `${BASE}/${id}`,
    method: 'DELETE',
    params: { version },
  })
}
