/**
 * Parenting sessions resource — REST foundation for Section IX.
 */
import { customInstance } from '@/api/client'
import {
  aggregateAttendanceSummary,
  mapCreateInputToDto,
  mapPaginatedParentingSessionsToViewModel,
  mapParentingSessionDtoToViewModel,
  mapUpdateInputToDto,
  type PaginatedParentingSessionsDto,
  type ParentingSessionDto,
} from '@/api/mappers/parenting-sessions.mapper'
import type {
  CreateParentingSessionInput,
  ParentingSessionAttendanceSummary,
  ParentingSessionListFilters,
  ParentingSessionListResult,
  ParentingSessionViewModel,
  UpdateParentingSessionInput,
} from '@/models/parenting-sessions'

const BASE = '/api/v1/parenting-sessions'

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), 100)
}

function listParams(filters: ParentingSessionListFilters): Record<string, string | number> {
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

export async function listParentingSessions(
  filters: ParentingSessionListFilters = {},
): Promise<ParentingSessionListResult> {
  const dto = await customInstance<PaginatedParentingSessionsDto>({
    url: BASE,
    method: 'GET',
    params: listParams(filters),
  })
  return mapPaginatedParentingSessionsToViewModel(dto)
}

/** Paginate through all sessions in a period to build attendance totals. */
export async function fetchParentingSessionsAttendanceSummary(
  filters: Pick<ParentingSessionListFilters, 'centerId' | 'districtId' | 'from' | 'to'>,
): Promise<ParentingSessionAttendanceSummary> {
  const centerId = filters.centerId ?? ''
  const from = filters.from ?? ''
  const to = filters.to ?? ''

  const all: ParentingSessionViewModel[] = []
  let page = 1
  let totalPages = 1

  do {
    const result = await listParentingSessions({
      ...filters,
      page,
      pageSize: 100,
    })
    all.push(...result.items)
    totalPages = result.totalPages
    page += 1
  } while (page <= totalPages)

  return aggregateAttendanceSummary(all, { centerId, from, to })
}

export async function getParentingSession(id: string): Promise<ParentingSessionViewModel> {
  const dto = await customInstance<ParentingSessionDto>({
    url: `${BASE}/${id}`,
    method: 'GET',
  })
  return mapParentingSessionDtoToViewModel(dto)
}

export async function createParentingSession(
  input: CreateParentingSessionInput,
): Promise<ParentingSessionViewModel> {
  const dto = await customInstance<ParentingSessionDto>({
    url: BASE,
    method: 'POST',
    data: mapCreateInputToDto(input),
  })
  return mapParentingSessionDtoToViewModel(dto)
}

export async function updateParentingSession(
  id: string,
  input: UpdateParentingSessionInput,
): Promise<ParentingSessionViewModel> {
  const dto = await customInstance<ParentingSessionDto>({
    url: `${BASE}/${id}`,
    method: 'PATCH',
    data: mapUpdateInputToDto(input),
  })
  return mapParentingSessionDtoToViewModel(dto)
}
