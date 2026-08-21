/**
 * Transfers resource — wrappers for transfer endpoints not yet in Orval output,
 * plus thin helpers over generated transfer DTOs.
 */
import { apiClient } from '@/api/client'
import type { TransferResponseDto } from '@/api/generated/models/transferResponseDto'
import type { TransferStatus } from '@/api/generated/models/transferStatus'

export interface ChildTransferHistoryFilters {
  page?: number
  pageSize?: number
}

export interface ChildTransferHistoryResult {
  childId: string
  items: TransferResponseDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** GET /api/v1/children/{id}/transfer-history */
export async function fetchChildTransferHistory(
  childId: string,
  filters: ChildTransferHistoryFilters = {},
): Promise<ChildTransferHistoryResult> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50
  const { data } = await apiClient.get<{
    childId: string
    items: TransferResponseDto[]
    total: number
    page?: number
    pageSize?: number
    totalPages?: number
  }>(`/api/v1/children/${childId}/transfer-history`, {
    params: { page, pageSize },
  })

  const total = data.total ?? data.items?.length ?? 0
  const resolvedPageSize = data.pageSize ?? pageSize
  const totalPages =
    data.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, resolvedPageSize)))

  return {
    childId: data.childId ?? childId,
    items: data.items ?? [],
    total,
    page: data.page ?? page,
    pageSize: resolvedPageSize,
    totalPages,
  }
}

export type TransferDirection = 'incoming' | 'outgoing'

export interface CenterTransferHistoryFilters {
  page?: number
  pageSize?: number
  /** Omit to include all statuses. */
  status?: TransferStatus
  /** Relative to the center: incoming (toCenter) or outgoing (fromCenter). */
  direction?: TransferDirection
}

export interface CenterTransferHistoryItem extends TransferResponseDto {
  direction: TransferDirection
}

export interface CenterTransferHistoryResult {
  centerId: string
  items: CenterTransferHistoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** GET /api/v1/centers/{id}/transfer-history */
export async function fetchCenterTransferHistory(
  centerId: string,
  filters: CenterTransferHistoryFilters = {},
): Promise<CenterTransferHistoryResult> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50
  const { data } = await apiClient.get<{
    centerId: string
    items: CenterTransferHistoryItem[]
    total: number
    page?: number
    pageSize?: number
    totalPages?: number
  }>(`/api/v1/centers/${centerId}/transfer-history`, {
    params: {
      page,
      pageSize,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
    },
  })

  const total = data.total ?? data.items?.length ?? 0
  const resolvedPageSize = data.pageSize ?? pageSize
  const totalPages =
    data.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, resolvedPageSize)))

  return {
    centerId: data.centerId ?? centerId,
    items: data.items ?? [],
    total,
    page: data.page ?? page,
    pageSize: resolvedPageSize,
    totalPages,
  }
}
