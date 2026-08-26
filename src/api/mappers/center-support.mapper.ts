import type {
  CenterSupportCategory,
  CenterSupportListResult,
  CenterSupportViewModel,
  CreateCenterSupportInput,
  UpdateCenterSupportInput,
} from '@/models/center-support'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'

/** Raw REST shapes — kept inside resource/mapper boundary. */
export type CenterSupportDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  receivedDate: string
  supportCategory: CenterSupportCategory
  description: string
  quantity: number | string | null
  unit: string | null
  providerName: string
  providerOrganization: string | null
  receivedById: string | null
  receivedByName: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedCenterSupportDto = {
  items: CenterSupportDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? null : n
}

function isSupportCategory(value: string): value is CenterSupportCategory {
  return (CENTER_SUPPORT_CATEGORIES as readonly string[]).includes(value)
}

export function mapCenterSupportDtoToViewModel(dto: CenterSupportDto): CenterSupportViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    receivedDate: toDateOnly(dto.receivedDate),
    supportCategory: isSupportCategory(dto.supportCategory) ? dto.supportCategory : 'other',
    description: dto.description,
    quantity: toNumberOrNull(dto.quantity),
    unit: dto.unit,
    providerName: dto.providerName,
    providerOrganization: dto.providerOrganization,
    receivedById: dto.receivedById,
    receivedByName: dto.receivedByName,
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
  }
}

export function mapPaginatedCenterSupportToViewModel(
  dto: PaginatedCenterSupportDto,
): CenterSupportListResult {
  return {
    items: (dto.items ?? []).map(mapCenterSupportDtoToViewModel),
    total: dto.total ?? 0,
    page: dto.page ?? 1,
    pageSize: dto.pageSize ?? 20,
    totalPages: dto.totalPages ?? 1,
  }
}

export function mapCreateCenterSupportInputToDto(
  input: CreateCenterSupportInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    centerId: input.centerId,
    receivedDate: input.receivedDate,
    supportCategory: input.supportCategory,
    description: input.description.trim(),
    providerName: input.providerName.trim(),
  }
  if (input.quantity != null) body.quantity = input.quantity
  if (input.unit?.trim()) body.unit = input.unit.trim()
  if (input.providerOrganization?.trim()) {
    body.providerOrganization = input.providerOrganization.trim()
  }
  if (input.receivedById) body.receivedById = input.receivedById
  if (input.receivedByName?.trim()) body.receivedByName = input.receivedByName.trim()
  if (input.notes?.trim()) body.notes = input.notes.trim()
  return body
}

export function mapUpdateCenterSupportInputToDto(
  input: UpdateCenterSupportInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = { version: input.version }
  if (input.supportCategory !== undefined) body.supportCategory = input.supportCategory
  if (input.description !== undefined) body.description = input.description.trim()
  if (input.quantity !== undefined) body.quantity = input.quantity
  if (input.unit !== undefined) body.unit = input.unit?.trim() || null
  if (input.providerName !== undefined) body.providerName = input.providerName.trim()
  if (input.providerOrganization !== undefined) {
    body.providerOrganization = input.providerOrganization?.trim() || null
  }
  if (input.notes !== undefined) body.notes = input.notes
  return body
}
