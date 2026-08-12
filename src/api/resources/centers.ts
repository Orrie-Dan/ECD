/**
 * Centers resource layer — bounded directory reads.
 * Prefer DB `total` + pageSize≤100; never hydrate the national center set client-side.
 */
import {
  centersControllerFindAll,
  centersControllerFindOne,
} from '@/api/generated/endpoints/centers/centers'
import type {
  CenterDetailResponseDto,
  CenterResponseDto,
  EcdCenterStatus,
  PaginatedCentersResponseDto,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export type CenterListFilters = {
  search?: string
  districtId?: string
  status?: EcdCenterStatus
  page?: number
  pageSize?: number
}

/** UI-facing center option — no DTO leakage into components. */
export interface CenterDirectoryItem {
  id: string
  name: string
  code: string
  districtId: string
  districtName: string | null
  villageName: string | null
  status: string
  activeChildrenCount: number
  latitude: number | null
  longitude: number | null
  /** Present on center detail DTO; list items are null. */
  caregiversCount: number | null
  attendancePresentToday: number | null
  attendanceAbsentToday: number | null
  pendingReferralsCount: number | null
  phone: string | null
  /** Detail-only identity fields; list items are null. */
  provinceName: string | null
  capacity: number | null
}

function mapListCenter(dto: CenterResponseDto): CenterDirectoryItem {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    districtId: dto.districtId,
    districtName: dto.districtName,
    villageName: dto.villageName,
    status: dto.status,
    activeChildrenCount: dto.activeChildrenCount,
    latitude: dto.latitude,
    longitude: dto.longitude,
    caregiversCount: null,
    attendancePresentToday: null,
    attendanceAbsentToday: null,
    pendingReferralsCount: null,
    phone: dto.phone,
    provinceName: null,
    capacity: dto.capacity,
  }
}

function mapDetailCenter(dto: CenterDetailResponseDto): CenterDirectoryItem {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    districtId: dto.districtId,
    districtName: dto.districtName,
    villageName: dto.villageName,
    status: dto.status,
    activeChildrenCount: dto.activeChildrenCount,
    latitude: dto.latitude,
    longitude: dto.longitude,
    caregiversCount: dto.caregiversCount,
    attendancePresentToday: dto.attendancePresentToday,
    attendanceAbsentToday: dto.attendanceAbsentToday,
    pendingReferralsCount: dto.pendingReferralsCount,
    phone: dto.phone,
    provinceName: dto.provinceName,
    capacity: dto.capacity,
  }
}

/**
 * Server-paginated national (or filtered) center directory — GET /centers.
 * Safe at ~39k centers when pageSize ≤ 100.
 */
export async function listCentersPage(
  filters: CenterListFilters = {},
): Promise<PaginatedCentersResponseDto> {
  return centersControllerFindAll({
    districtId: filters.districtId,
    status: filters.status,
    search: filters.search?.trim() || undefined,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

/** Single center identity + today snapshots — GET /centers/:id. */
export async function getCenterDetail(id: string): Promise<CenterDetailResponseDto> {
  return centersControllerFindOne(id)
}

export async function listCentersDirectory(params?: {
  districtId?: string
  search?: string
  status?: EcdCenterStatus
  page?: number
  pageSize?: number
}): Promise<{ items: CenterDirectoryItem[]; total: number }> {
  const page = await listCentersPage({
    districtId: params?.districtId,
    search: params?.search,
    status: params?.status,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 100,
  })
  return {
    items: page.items.map(mapListCenter),
    total: page.total,
  }
}

export async function getCenterDirectoryItem(id: string): Promise<CenterDirectoryItem> {
  const dto = await getCenterDetail(id)
  return mapDetailCenter(dto)
}

export const CENTERS_MAX_PAGE_SIZE = MAX_PAGE_SIZE
