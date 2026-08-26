/**
 * Centre visitor log resource — REST foundation for Section XIII.
 * OpenAPI Orval client not yet generated for this domain; uses customInstance.
 */
import { customInstance } from '@/api/client'
import {
  mapCenterVisitDtoToViewModel,
  mapCreateCenterVisitInputToDto,
  mapPaginatedCenterVisitsToViewModel,
  mapUpdateCenterVisitInputToDto,
  type CenterVisitDto,
  type PaginatedCenterVisitsDto,
} from '@/api/mappers/center-visits.mapper'
import type {
  CenterVisitListFilters,
  CenterVisitListResult,
  CenterVisitViewModel,
  CreateCenterVisitInput,
  UpdateCenterVisitInput,
} from '@/models/center-visits'

const BASE = '/api/v1/center-visits'

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

function listParams(filters: CenterVisitListFilters): Record<string, string | number> {
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

export async function listCenterVisits(
  filters: CenterVisitListFilters = {},
): Promise<CenterVisitListResult> {
  const dto = await customInstance<PaginatedCenterVisitsDto>({
    url: BASE,
    method: 'GET',
    params: listParams(filters),
  })
  return mapPaginatedCenterVisitsToViewModel(dto)
}

export async function getCenterVisit(id: string): Promise<CenterVisitViewModel> {
  const dto = await customInstance<CenterVisitDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapCenterVisitDtoToViewModel(dto)
}

export async function createCenterVisit(
  input: CreateCenterVisitInput,
): Promise<CenterVisitViewModel> {
  const dto = await customInstance<CenterVisitDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateCenterVisitInputToDto(input),
  })
  return mapCenterVisitDtoToViewModel(dto)
}

export async function updateCenterVisit(
  id: string,
  input: UpdateCenterVisitInput,
): Promise<CenterVisitViewModel> {
  const dto = await customInstance<CenterVisitDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateCenterVisitInputToDto(input),
  })
  return mapCenterVisitDtoToViewModel(dto)
}
