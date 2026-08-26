import type {
  CommitteeMemberListResult,
  CommitteeMemberViewModel,
  CreateCommitteeMemberInput,
  DeactivateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
} from '@/models/committee-members'

export type CommitteeMemberDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  userId: string | null
  fullName: string
  position: string
  phone: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedCommitteeMembersDto = {
  items: CommitteeMemberDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function mapCommitteeMemberDtoToViewModel(
  dto: CommitteeMemberDto,
): CommitteeMemberViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    userId: dto.userId,
    fullName: dto.fullName,
    position: dto.position,
    phone: dto.phone,
    startDate: toDateOnly(dto.startDate),
    endDate: toDateOnly(dto.endDate),
    isActive: dto.isActive,
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
  }
}

export function mapPaginatedCommitteeMembersToViewModel(
  dto: PaginatedCommitteeMembersDto,
): CommitteeMemberListResult {
  return {
    items: dto.items.map(mapCommitteeMemberDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapCreateInputToDto(input: CreateCommitteeMemberInput) {
  return {
    centerId: input.centerId,
    userId: input.userId,
    fullName: input.fullName.trim(),
    position: input.position.trim(),
    phone: input.phone?.trim() || undefined,
    startDate: input.startDate || undefined,
    notes: input.notes?.trim() || undefined,
  }
}

export function mapUpdateInputToDto(input: UpdateCommitteeMemberInput) {
  const dto: Record<string, unknown> = { version: input.version }
  if (input.fullName !== undefined) dto.fullName = input.fullName.trim()
  if (input.position !== undefined) dto.position = input.position.trim()
  if (input.phone !== undefined) dto.phone = input.phone?.trim() || null
  if (input.startDate !== undefined) dto.startDate = input.startDate
  if (input.notes !== undefined) dto.notes = input.notes?.trim() || null
  return dto
}

export function mapDeactivateInputToDto(input: DeactivateCommitteeMemberInput) {
  return {
    version: input.version,
    ...(input.endDate ? { endDate: input.endDate } : {}),
  }
}
