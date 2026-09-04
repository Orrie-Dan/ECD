/**
 * Geo resource layer — bounded district/center directory reads.
 * Prefer `total` from paginated responses; never page through all districts/centers.
 */
import {
  geoControllerGetDistrict,
  geoControllerListAdminUnits,
  geoControllerListDistricts,
} from '@/api/generated/endpoints/geo/geo'
import { centersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import type {
  AdministrativeLevel,
  AdminUnitResponseDto,
  DistrictResponseDto,
  EcdCenterStatus,
  PaginatedCentersResponseDto,
  PaginatedDistrictsResponseDto,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export type DistrictListFilters = {
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export type DistrictCenterListFilters = {
  districtId: string
  search?: string
  status?: EcdCenterStatus
  page?: number
  pageSize?: number
}

/** National (or scoped) district count via DB `total` — pageSize=1 keeps payload tiny. */
export async function fetchDistrictsTotal(params?: {
  search?: string
  isActive?: boolean
}): Promise<number> {
  const page = await geoControllerListDistricts({
    search: params?.search,
    isActive: params?.isActive,
    page: 1,
    pageSize: 1,
  })
  return page.total
}

/** Center count via DB `total` — optional status / district filter. */
export async function fetchCentersTotal(params?: {
  districtId?: string
  status?: EcdCenterStatus
  search?: string
}): Promise<number> {
  const page = await centersControllerFindAll({
    districtId: params?.districtId,
    status: params?.status,
    search: params?.search,
    page: 1,
    pageSize: 1,
  })
  return page.total
}

/** Server-paginated district directory — NCDA national governance list. */
export async function listDistrictsPage(
  filters: DistrictListFilters = {},
): Promise<PaginatedDistrictsResponseDto> {
  return geoControllerListDistricts({
    search: filters.search?.trim() || undefined,
    isActive: filters.isActive,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

/** Single district identity — GET /districts/:id. */
export async function getDistrict(id: string): Promise<DistrictResponseDto> {
  return geoControllerGetDistrict(id)
}

/**
 * Resolve a user-facing route key (business `code` or legacy UUID) to a district id.
 */
export async function resolveDistrictRouteKey(
  routeKey: string,
): Promise<{ id: string; code: string } | null> {
  const key = routeKey.trim()
  if (!key) return null

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (UUID_RE.test(key)) {
    try {
      const detail = await getDistrict(key)
      return { id: detail.id, code: detail.code }
    } catch {
      return { id: key, code: '' }
    }
  }

  const page = await listDistrictsPage({ search: key, page: 1, pageSize: 40 })
  const exact = page.items.find((item) => item.code.toLowerCase() === key.toLowerCase())
  if (!exact) return null
  return { id: exact.id, code: exact.code }
}

/**
 * Centers in a district via GET /centers?districtId= (DB pagination + search/status).
 * Prefer this over unfiltered national center lists.
 */
export async function listCentersByDistrictPage(
  filters: DistrictCenterListFilters,
): Promise<PaginatedCentersResponseDto> {
  return centersControllerFindAll({
    districtId: filters.districtId,
    search: filters.search?.trim() || undefined,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

/** Admin units (sector / cell / village) — bounded by district or parent. */
export async function listAdminUnits(params: {
  districtId?: string
  parentId?: string
  level?: AdministrativeLevel
}): Promise<AdminUnitResponseDto[]> {
  return geoControllerListAdminUnits({
    districtId: params.districtId,
    parentId: params.parentId,
    level: params.level,
  })
}

export const GEO_MAX_PAGE_SIZE = MAX_PAGE_SIZE
