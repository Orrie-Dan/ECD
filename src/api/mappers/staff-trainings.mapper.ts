import type {
  CreateStaffTrainingInput,
  StaffTrainingListResult,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'

/** Raw REST shapes — kept inside resource/mapper boundary. */
export type StaffTrainingDto = {
  id: string
  centerId: string
  centerName: string
  districtId: string
  traineeUserId: string | null
  traineeName: string
  traineeRole: string
  trainingDate: string
  trainingProvider: string
  topic: string
  durationDays: number
  certificateReceived: boolean
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export type PaginatedStaffTrainingsDto = {
  items: StaffTrainingDto[]
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

export function mapStaffTrainingDtoToViewModel(dto: StaffTrainingDto): StaffTrainingViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    centerName: dto.centerName,
    districtId: dto.districtId,
    traineeUserId: dto.traineeUserId,
    traineeName: dto.traineeName,
    traineeRole: dto.traineeRole,
    trainingDate: toDateOnly(dto.trainingDate),
    trainingProvider: dto.trainingProvider,
    topic: dto.topic,
    durationDays: dto.durationDays,
    certificateReceived: Boolean(dto.certificateReceived),
    notes: dto.notes,
    recordedById: dto.recordedById,
    version: dto.version,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
  }
}

export function mapPaginatedStaffTrainingsToViewModel(
  dto: PaginatedStaffTrainingsDto,
): StaffTrainingListResult {
  return {
    items: (dto.items ?? []).map(mapStaffTrainingDtoToViewModel),
    total: dto.total ?? 0,
    page: dto.page ?? 1,
    pageSize: dto.pageSize ?? 20,
    totalPages: dto.totalPages ?? 1,
  }
}

export function mapCreateStaffTrainingInputToDto(
  input: CreateStaffTrainingInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    centerId: input.centerId,
    traineeName: input.traineeName.trim(),
    traineeRole: input.traineeRole.trim(),
    trainingDate: input.trainingDate,
    trainingProvider: input.trainingProvider.trim(),
    topic: input.topic.trim(),
    durationDays: input.durationDays,
    certificateReceived: input.certificateReceived,
  }
  if (input.traineeUserId) body.traineeUserId = input.traineeUserId
  if (input.notes?.trim()) body.notes = input.notes.trim()
  return body
}

export function mapUpdateStaffTrainingInputToDto(
  input: UpdateStaffTrainingInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = { version: input.version }
  if (input.traineeUserId !== undefined) body.traineeUserId = input.traineeUserId
  if (input.traineeName !== undefined) body.traineeName = input.traineeName.trim()
  if (input.traineeRole !== undefined) body.traineeRole = input.traineeRole.trim()
  if (input.trainingProvider !== undefined) {
    body.trainingProvider = input.trainingProvider.trim()
  }
  if (input.topic !== undefined) body.topic = input.topic.trim()
  if (input.durationDays !== undefined) body.durationDays = input.durationDays
  if (input.certificateReceived !== undefined) {
    body.certificateReceived = input.certificateReceived
  }
  if (input.notes !== undefined) body.notes = input.notes
  return body
}
