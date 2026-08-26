import type {
  CenterVisitListResult,
  CenterVisitViewModel,
  CreateCenterVisitInput,
  UpdateCenterVisitInput,
} from '@/models/center-visits'

/** Raw REST shapes — kept inside resource/mapper boundary. */
export type CenterVisitDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  visitDate: string
  visitorName: string
  organization: string | null
  occupationOrRole: string | null
  purposeOrMessage: string
  hostedById: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedCenterVisitsDto = {
  items: CenterVisitDto[]
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

export function mapCenterVisitDtoToViewModel(dto: CenterVisitDto): CenterVisitViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    visitDate: toDateOnly(dto.visitDate),
    visitorName: dto.visitorName,
    organization: dto.organization,
    occupationOrRole: dto.occupationOrRole,
    purposeOrMessage: dto.purposeOrMessage,
    hostedById: dto.hostedById,
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
  }
}

export function mapPaginatedCenterVisitsToViewModel(
  dto: PaginatedCenterVisitsDto,
): CenterVisitListResult {
  return {
    items: (dto.items ?? []).map(mapCenterVisitDtoToViewModel),
    total: dto.total ?? 0,
    page: dto.page ?? 1,
    pageSize: dto.pageSize ?? 20,
    totalPages: dto.totalPages ?? 1,
  }
}

export function mapCreateCenterVisitInputToDto(
  input: CreateCenterVisitInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    centerId: input.centerId,
    visitDate: input.visitDate,
    visitorName: input.visitorName.trim(),
    purposeOrMessage: input.purposeOrMessage.trim(),
  }
  if (input.organization?.trim()) body.organization = input.organization.trim()
  if (input.occupationOrRole?.trim()) body.occupationOrRole = input.occupationOrRole.trim()
  if (input.hostedById) body.hostedById = input.hostedById
  if (input.notes?.trim()) body.notes = input.notes.trim()
  return body
}

export function mapUpdateCenterVisitInputToDto(
  input: UpdateCenterVisitInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = { version: input.version }
  if (input.visitorName !== undefined) body.visitorName = input.visitorName.trim()
  if (input.organization !== undefined) {
    body.organization = input.organization?.trim() || null
  }
  if (input.occupationOrRole !== undefined) {
    body.occupationOrRole = input.occupationOrRole?.trim() || null
  }
  if (input.purposeOrMessage !== undefined) {
    body.purposeOrMessage = input.purposeOrMessage.trim()
  }
  if (input.hostedById !== undefined) body.hostedById = input.hostedById
  if (input.notes !== undefined) body.notes = input.notes
  return body
}
