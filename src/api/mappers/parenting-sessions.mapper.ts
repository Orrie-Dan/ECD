import type {
  CreateParentingSessionInput,
  ParentingSessionAttendanceSummary,
  ParentingSessionListResult,
  ParentingSessionViewModel,
  UpdateParentingSessionInput,
} from '@/models/parenting-sessions'

export type ParentingSessionDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  sessionDate: string
  topic: string
  facilitatorName: string
  facilitatorRole: string | null
  facilitatorUserId: string | null
  messageSummary: string
  maleAttendees: number
  femaleAttendees: number
  totalAttendees: number
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedParentingSessionsDto = {
  items: ParentingSessionDto[]
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

function toIsoDateTime(value: string | null | undefined): string {
  if (!value) return ''
  return value
}

export function mapParentingSessionDtoToViewModel(
  dto: ParentingSessionDto,
): ParentingSessionViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    sessionDate: toDateOnly(dto.sessionDate),
    topic: dto.topic,
    facilitatorName: dto.facilitatorName,
    facilitatorRole: dto.facilitatorRole,
    facilitatorUserId: dto.facilitatorUserId,
    messageSummary: dto.messageSummary,
    maleAttendees: dto.maleAttendees,
    femaleAttendees: dto.femaleAttendees,
    totalAttendees: dto.totalAttendees,
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: toIsoDateTime(dto.createdAt),
    updatedAt: toIsoDateTime(dto.updatedAt),
  }
}

export function mapPaginatedParentingSessionsToViewModel(
  dto: PaginatedParentingSessionsDto,
): ParentingSessionListResult {
  return {
    items: dto.items.map(mapParentingSessionDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function aggregateAttendanceSummary(
  sessions: ParentingSessionViewModel[],
  filters: { centerId: string; from: string; to: string },
): ParentingSessionAttendanceSummary {
  let maleAttendeesTotal = 0
  let femaleAttendeesTotal = 0

  for (const session of sessions) {
    maleAttendeesTotal += session.maleAttendees
    femaleAttendeesTotal += session.femaleAttendees
  }

  return {
    centerId: filters.centerId,
    from: filters.from,
    to: filters.to,
    sessionCount: sessions.length,
    maleAttendeesTotal,
    femaleAttendeesTotal,
    totalAttendees: maleAttendeesTotal + femaleAttendeesTotal,
  }
}

export function mapCreateInputToDto(input: CreateParentingSessionInput) {
  return {
    centerId: input.centerId,
    sessionDate: input.sessionDate,
    topic: input.topic.trim(),
    facilitatorName: input.facilitatorName.trim(),
    facilitatorRole: input.facilitatorRole?.trim() || undefined,
    facilitatorUserId: input.facilitatorUserId,
    messageSummary: input.messageSummary.trim(),
    maleAttendees: input.maleAttendees,
    femaleAttendees: input.femaleAttendees,
    notes: input.notes?.trim() || undefined,
  }
}

export function mapUpdateInputToDto(input: UpdateParentingSessionInput) {
  const dto: Record<string, unknown> = { version: input.version }
  if (input.topic !== undefined) dto.topic = input.topic.trim()
  if (input.facilitatorName !== undefined) dto.facilitatorName = input.facilitatorName.trim()
  if (input.facilitatorRole !== undefined) {
    dto.facilitatorRole = input.facilitatorRole?.trim() || null
  }
  if (input.facilitatorUserId !== undefined) dto.facilitatorUserId = input.facilitatorUserId
  if (input.messageSummary !== undefined) dto.messageSummary = input.messageSummary.trim()
  if (input.maleAttendees !== undefined) dto.maleAttendees = input.maleAttendees
  if (input.femaleAttendees !== undefined) dto.femaleAttendees = input.femaleAttendees
  if (input.notes !== undefined) dto.notes = input.notes?.trim() || null
  return dto
}
