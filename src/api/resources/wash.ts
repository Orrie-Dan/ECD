/**
 * WASH resource — paginated indicator records + detail.
 * No national aggregate API; do not client-scan pages for coverage KPIs.
 */
import {
  washControllerGetIndicator,
  washControllerListIndicators,
} from '@/api/generated/endpoints/wash/wash'
import type {
  PaginatedWashIndicatorsResponseDto,
  WashIndicatorResponseDto,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export const WASH_MAX_PAGE_SIZE = MAX_PAGE_SIZE

export type WashIndicatorsListFilters = {
  centerId?: string
  districtId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function listWashIndicatorsPage(
  filters: WashIndicatorsListFilters = {},
): Promise<PaginatedWashIndicatorsResponseDto> {
  return washControllerListIndicators({
    centerId: filters.centerId,
    districtId: filters.districtId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

export async function getWashIndicator(id: string): Promise<WashIndicatorResponseDto> {
  return washControllerGetIndicator(id)
}
