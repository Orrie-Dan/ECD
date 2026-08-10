import type {
  CreateReferralDto,
  PaginatedReferralsResponseDto,
  ReferralHistoryResponseDto,
  ReferralResponseDto,
  UpdateReferralStatusDto,
} from '@/api/generated/models'
import type {
  ReferralCreateInput,
  ReferralHistoryResult,
  ReferralListResult,
  ReferralStatusUpdateInput,
  ReferralViewModel,
} from '@/models/referral'
import type { ReferralSourceType, ReferralStatus } from '@/types'

function mapStatus(value: string | null | undefined): ReferralStatus {
  if (value === 'pending' || value === 'completed' || value === 'cancelled') {
    return value
  }
  return 'pending'
}

function mapSourceType(value: string | null | undefined): ReferralSourceType {
  if (value === 'nutrition' || value === 'sted') {
    return value
  }
  return 'nutrition'
}

/** API response → UI view model (sourceId → assessmentId, referralDate → date). */
export function mapReferralDtoToViewModel(dto: ReferralResponseDto): ReferralViewModel {
  return {
    id: dto.id,
    childId: dto.childId,
    centerId: dto.centerId,
    assessmentId: dto.sourceId,
    sourceType: mapSourceType(dto.sourceType),
    date: dto.referralDate,
    reason: dto.reason,
    status: mapStatus(dto.status),
    destination: dto.destination,
    implementedAt: dto.implementedAt ?? undefined,
    notes: dto.notes ?? undefined,
    version: dto.version,
    recordedBy: dto.recordedBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function mapReferralListToViewModel(
  dto: PaginatedReferralsResponseDto,
): ReferralListResult {
  return {
    items: dto.items.map(mapReferralDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapReferralHistoryToViewModel(
  dto: ReferralHistoryResponseDto,
): ReferralHistoryResult {
  return {
    childId: dto.childId,
    items: dto.items.map(mapReferralDtoToViewModel),
    total: dto.total,
  }
}

export function mapReferralCreateToDto(input: ReferralCreateInput): CreateReferralDto {
  if (!input.centerId) {
    throw new Error('centerId is required to create a referral')
  }
  return {
    childId: input.childId,
    centerId: input.centerId,
    sourceType: input.sourceType,
    sourceId: input.assessmentId,
    referralDate: input.date,
    reason: input.reason.trim(),
    destination: input.destination.trim(),
    notes: input.notes?.trim() ? input.notes.trim() : undefined,
  }
}

export function mapReferralStatusUpdateToDto(
  input: ReferralStatusUpdateInput,
): UpdateReferralStatusDto {
  return {
    version: input.version,
    status: input.status,
    implementedAt: input.implementedAt,
    notes: input.notes !== undefined ? input.notes : undefined,
  }
}

/** Narrow a Referral-like object to ReferralViewModel when already enriched. */
export function asReferralViewModel(
  referral: ReferralViewModel | (Omit<ReferralViewModel, 'version' | 'centerId'> & {
    version?: number
    centerId?: string
  }),
  fallbackCenterId = '',
): ReferralViewModel {
  return {
    ...referral,
    centerId: referral.centerId ?? fallbackCenterId,
    version: referral.version ?? 0,
  }
}
