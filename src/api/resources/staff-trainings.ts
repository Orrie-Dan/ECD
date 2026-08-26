/**
 * Staff trainings resource — REST foundation for Section XIV.
 * OpenAPI Orval client not yet generated for this domain; uses customInstance.
 */
import { customInstance } from '@/api/client'
import { normalizeApiError } from '@/api/errors'
import {
  mapCreateStaffTrainingInputToDto,
  mapPaginatedStaffTrainingsToViewModel,
  mapStaffTrainingDtoToViewModel,
  mapUpdateStaffTrainingInputToDto,
  type PaginatedStaffTrainingsDto,
  type StaffTrainingDto,
} from '@/api/mappers/staff-trainings.mapper'
import type {
  CreateStaffTrainingInput,
  StaffTrainingListFilters,
  StaffTrainingListResult,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'

const BASE = '/api/v1/staff-trainings'
const FALLBACK_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

export function listStaffTrainingParams(
  filters: StaffTrainingListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  }
  if (filters.centerId) params.centerId = filters.centerId
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.traineeUserId) params.traineeUserId = filters.traineeUserId
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  return params
}

/** Nest ValidationPipe (forbidNonWhitelisted) until traineeUserId is deployed. */
export function isUnknownListQueryProperty(error: unknown, property: string): boolean {
  const api = normalizeApiError(error)
  if (api.statusCode !== 400) return false
  const haystack = `${api.message} ${api.messages.join(' ')}`.toLowerCase()
  return haystack.includes(`${property.toLowerCase()} should not exist`)
}

export function paginateTraineeFallback(
  items: StaffTrainingViewModel[],
  traineeUserId: string,
  page: number,
  pageSize: number,
): StaffTrainingListResult {
  const filtered = items.filter((row) => row.traineeUserId === traineeUserId)
  const size = clampPageSize(pageSize)
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * size
  const total = filtered.length
  return {
    items: filtered.slice(start, start + size),
    total,
    page: safePage,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size) || 1),
  }
}

async function fetchStaffTrainingsList(
  filters: StaffTrainingListFilters,
  skipApiErrorToast = false,
): Promise<StaffTrainingListResult> {
  const dto = await customInstance<PaginatedStaffTrainingsDto>({
    url: BASE,
    method: 'GET',
    params: listStaffTrainingParams(filters),
    skipApiErrorToast,
  })
  return mapPaginatedStaffTrainingsToViewModel(dto)
}

export async function listStaffTrainings(
  filters: StaffTrainingListFilters = {},
): Promise<StaffTrainingListResult> {
  try {
    return await fetchStaffTrainingsList(filters, Boolean(filters.traineeUserId))
  } catch (error) {
    if (!filters.traineeUserId || !isUnknownListQueryProperty(error, 'traineeUserId')) {
      throw error
    }
    const unfiltered = await fetchStaffTrainingsList(
      {
        ...filters,
        traineeUserId: undefined,
        page: 1,
        pageSize: FALLBACK_PAGE_SIZE,
      },
      false,
    )
    return paginateTraineeFallback(
      unfiltered.items,
      filters.traineeUserId,
      filters.page ?? 1,
      filters.pageSize ?? 20,
    )
  }
}

export async function getStaffTraining(id: string): Promise<StaffTrainingViewModel> {
  const dto = await customInstance<StaffTrainingDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapStaffTrainingDtoToViewModel(dto)
}

export async function createStaffTraining(
  input: CreateStaffTrainingInput,
): Promise<StaffTrainingViewModel> {
  const dto = await customInstance<StaffTrainingDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateStaffTrainingInputToDto(input),
  })
  return mapStaffTrainingDtoToViewModel(dto)
}

export async function updateStaffTraining(
  id: string,
  input: UpdateStaffTrainingInput,
): Promise<StaffTrainingViewModel> {
  const dto = await customInstance<StaffTrainingDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateStaffTrainingInputToDto(input),
  })
  return mapStaffTrainingDtoToViewModel(dto)
}
