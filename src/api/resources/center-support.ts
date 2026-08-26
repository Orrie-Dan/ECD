/**
 * Centre support resource — REST foundation for Section XII.
 * OpenAPI Orval client not yet generated for this domain; uses customInstance.
 */
import { customInstance } from '@/api/client'
import {
  mapCenterSupportDtoToViewModel,
  mapCreateCenterSupportInputToDto,
  mapPaginatedCenterSupportToViewModel,
  mapUpdateCenterSupportInputToDto,
  type CenterSupportDto,
  type PaginatedCenterSupportDto,
} from '@/api/mappers/center-support.mapper'
import type {
  CenterSupportListFilters,
  CenterSupportListResult,
  CenterSupportViewModel,
  CreateCenterSupportInput,
  UpdateCenterSupportInput,
} from '@/models/center-support'

const BASE = '/api/v1/center-support'

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

function listParams(filters: CenterSupportListFilters): Record<string, string | number> {
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

export async function listCenterSupport(
  filters: CenterSupportListFilters = {},
): Promise<CenterSupportListResult> {
  const dto = await customInstance<PaginatedCenterSupportDto>({
    url: BASE,
    method: 'GET',
    params: listParams(filters),
  })
  const result = mapPaginatedCenterSupportToViewModel(dto)

  // API list has no supportCategory query — filter the current page client-side.
  if (filters.supportCategory && filters.supportCategory !== 'all') {
    const items = result.items.filter(
      (item) => item.supportCategory === filters.supportCategory,
    )
    return { ...result, items }
  }
  return result
}

export async function getCenterSupport(id: string): Promise<CenterSupportViewModel> {
  const dto = await customInstance<CenterSupportDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapCenterSupportDtoToViewModel(dto)
}

export async function createCenterSupport(
  input: CreateCenterSupportInput,
): Promise<CenterSupportViewModel> {
  const dto = await customInstance<CenterSupportDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateCenterSupportInputToDto(input),
  })
  return mapCenterSupportDtoToViewModel(dto)
}

export async function updateCenterSupport(
  id: string,
  input: UpdateCenterSupportInput,
): Promise<CenterSupportViewModel> {
  const dto = await customInstance<CenterSupportDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateCenterSupportInputToDto(input),
  })
  return mapCenterSupportDtoToViewModel(dto)
}
