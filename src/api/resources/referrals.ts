/**
 * Referral resource layer — wraps generated OpenAPI client + mappers.
 * Feature hooks import from here; UI never imports Referral*Dto types.
 */
import {
  referralsControllerCreate,
  referralsControllerFindAll,
  referralsControllerGetChildHistory,
  referralsControllerUpdateStatus,
} from '@/api/generated/endpoints/referrals/referrals'
import {
  mapReferralCreateToDto,
  mapReferralDtoToViewModel,
  mapReferralHistoryToViewModel,
  mapReferralListToViewModel,
  mapReferralStatusUpdateToDto,
} from '@/api/mappers/referral.mapper'
import type {
  ReferralCreateInput,
  ReferralHistoryResult,
  ReferralListFilters,
  ReferralListResult,
  ReferralStatusUpdateInput,
  ReferralViewModel,
} from '@/models/referral'

export async function fetchReferralList(
  filters: ReferralListFilters = {},
): Promise<ReferralListResult> {
  const dto = await referralsControllerFindAll({
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    status: filters.status,
    sourceType: filters.sourceType,
    centerId: filters.centerId,
    childId: filters.childId,
  })
  return mapReferralListToViewModel(dto)
}

/** Fetch all list pages (for DataProvider-style windows). */
export async function fetchAllReferrals(
  filters: Omit<ReferralListFilters, 'page' | 'pageSize'> = {},
): Promise<ReferralViewModel[]> {
  const pageSize = 200
  let page = 1
  let totalPages = 1
  const items: ReferralViewModel[] = []

  do {
    const result = await fetchReferralList({ ...filters, page, pageSize })
    items.push(...result.items)
    totalPages = Math.max(1, result.totalPages)
    page += 1
  } while (page <= totalPages)

  return items
}

export async function fetchChildReferralHistory(
  childId: string,
): Promise<ReferralHistoryResult> {
  const dto = await referralsControllerGetChildHistory(childId)
  return mapReferralHistoryToViewModel(dto)
}

export async function createReferralRequest(
  input: ReferralCreateInput,
): Promise<ReferralViewModel> {
  const dto = await referralsControllerCreate(mapReferralCreateToDto(input))
  return mapReferralDtoToViewModel(dto)
}

export async function updateReferralStatusRequest(
  input: ReferralStatusUpdateInput,
): Promise<ReferralViewModel> {
  const dto = await referralsControllerUpdateStatus(
    input.id,
    mapReferralStatusUpdateToDto(input),
  )
  return mapReferralDtoToViewModel(dto)
}

/**
 * Best-effort duplicate lookup before create.
 * Backend has no Idempotency-Key; we look up pending referrals for the same source.
 * Does not guarantee uniqueness under concurrent creates.
 */
export async function findPendingReferralForSource(
  childId: string,
  sourceId: string,
): Promise<ReferralViewModel | undefined> {
  const history = await fetchChildReferralHistory(childId)
  return history.items.find(
    (r) => r.assessmentId === sourceId && r.status === 'pending',
  )
}
