import type {
  CreateParentContributionInput,
  InKindItemType,
  ParentContributionListResult,
  ParentContributionSummaryViewModel,
  ParentContributionType,
  ParentContributionViewModel,
  UpdateParentContributionInput,
} from '@/models/contributions'

/** Raw REST shapes — kept inside resource/mapper boundary. */
export type ParentContributionDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  childId: string | null
  contributorName: string
  contributorPhone: string | null
  contributionDate: string
  contributionType: ParentContributionType
  amount: number | null
  itemType: InKindItemType | null
  quantity: number | null
  unit: string | null
  description: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedParentContributionsDto = {
  items: ParentContributionDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ParentContributionSummaryDto = {
  centerId: string
  from: string | null
  to: string | null
  cashContributorCount: number
  cashAmountTotal: number
  inKindContributorCount: number
  cashRecordCount: number
  inKindRecordCount: number
}

function toDateOnly(value: string | null | undefined): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function mapParentContributionDtoToViewModel(
  dto: ParentContributionDto,
): ParentContributionViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    childId: dto.childId,
    contributorName: dto.contributorName,
    contributorPhone: dto.contributorPhone,
    contributionDate: toDateOnly(dto.contributionDate),
    contributionType: dto.contributionType,
    amount: dto.amount,
    itemType: dto.itemType,
    quantity: dto.quantity,
    unit: dto.unit,
    description: dto.description,
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function mapPaginatedParentContributionsToViewModel(
  dto: PaginatedParentContributionsDto,
): ParentContributionListResult {
  return {
    items: (dto.items ?? []).map(mapParentContributionDtoToViewModel),
    total: dto.total ?? 0,
    page: dto.page ?? 1,
    pageSize: dto.pageSize ?? 20,
    totalPages: dto.totalPages ?? 1,
  }
}

export function mapParentContributionSummaryToViewModel(
  dto: ParentContributionSummaryDto,
): ParentContributionSummaryViewModel {
  return {
    centerId: dto.centerId,
    from: dto.from,
    to: dto.to,
    cashContributorCount: dto.cashContributorCount ?? 0,
    cashAmountTotal: dto.cashAmountTotal ?? 0,
    inKindContributorCount: dto.inKindContributorCount ?? 0,
    cashRecordCount: dto.cashRecordCount ?? 0,
    inKindRecordCount: dto.inKindRecordCount ?? 0,
  }
}

export function mapCreateInputToDto(
  input: CreateParentContributionInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    centerId: input.centerId,
    contributorName: input.contributorName.trim(),
    contributionDate: input.contributionDate,
    contributionType: input.contributionType,
  }
  if (input.childId) body.childId = input.childId
  if (input.contributorPhone?.trim()) body.contributorPhone = input.contributorPhone.trim()
  if (input.contributionType === 'cash') {
    body.amount = input.amount
  } else {
    body.itemType = input.itemType
    if (input.quantity != null) body.quantity = input.quantity
    if (input.unit?.trim()) body.unit = input.unit.trim()
  }
  if (input.description?.trim()) body.description = input.description.trim()
  if (input.notes?.trim()) body.notes = input.notes.trim()
  return body
}

export function mapUpdateInputToDto(
  input: UpdateParentContributionInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = { version: input.version }
  if (input.contributorName !== undefined) {
    body.contributorName = input.contributorName.trim()
  }
  if (input.contributorPhone !== undefined) {
    body.contributorPhone = input.contributorPhone?.trim() || null
  }
  if (input.contributionType !== undefined) {
    body.contributionType = input.contributionType
  }
  if (input.amount !== undefined) body.amount = input.amount
  if (input.itemType !== undefined) body.itemType = input.itemType
  if (input.quantity !== undefined) body.quantity = input.quantity
  if (input.unit !== undefined) body.unit = input.unit?.trim() || null
  if (input.description !== undefined) {
    body.description = input.description?.trim() || null
  }
  if (input.notes !== undefined) body.notes = input.notes
  return body
}
