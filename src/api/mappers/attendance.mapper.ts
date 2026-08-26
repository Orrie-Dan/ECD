import type {
  AttendanceBatchRecordDto,
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
} from '@/api/generated/models'
import type { AbsentReason as ApiAbsentReason } from '@/api/generated/models'
import type {
  AttendanceListResult,
  AttendanceUpsertInput,
  AttendanceViewModel,
} from '@/models/attendance'
import type { AbsentReason, AttendanceRecord } from '@/types'

const UI_ABSENT_REASONS: AbsentReason[] = [
  'sick',
  'family',
  'transport',
  'weather',
  'unknown',
  'other',
]

function mapAbsentReasonToUi(
  value: ApiAbsentReason | string | null | undefined,
): AbsentReason | undefined {
  if (!value) return undefined
  if (UI_ABSENT_REASONS.includes(value as AbsentReason)) {
    return value as AbsentReason
  }
  return 'other'
}

function mapAbsentReasonToApi(
  value: AbsentReason | undefined,
  present: boolean,
): ApiAbsentReason | undefined {
  if (present || !value) return undefined
  return value
}

/** Map list/detail DTO → view model. UI-only fields default empty until session overlay. */
export function mapAttendanceDtoToViewModel(dto: AttendanceResponseDto): AttendanceViewModel {
  return {
    id: dto.id,
    childId: dto.childId,
    date: dto.date,
    present: dto.present,
    absentReason: mapAbsentReasonToUi(dto.absentReason),
    notes: dto.notes ?? undefined,
    recordedBy: dto.recordedBy,
    version: dto.version,
    centerId: dto.centerId,
  }
}

export function mapPaginatedAttendanceToViewModel(
  dto: PaginatedAttendanceResponseDto,
): AttendanceListResult {
  return {
    items: dto.items.map(mapAttendanceDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

/**
 * Build a batch upsert record for REST.
 * Sync path (LocalStore/outbox) carries broughtBy / arrivedAt; REST batch does not.
 * Includes version when correcting an existing row.
 */
export function mapUpsertToBatchRecord(
  input: AttendanceUpsertInput,
  options?: { version?: number; localId?: string },
): AttendanceBatchRecordDto {
  const present = input.present
  const notes = input.notes?.trim() ? input.notes.trim() : undefined

  return {
    childId: input.childId,
    date: input.date,
    present,
    ...(present
      ? {}
      : {
          absentReason: mapAbsentReasonToApi(input.absentReason, present),
        }),
    ...(notes ? { notes } : {}),
    ...(options?.version !== undefined ? { version: options.version } : {}),
    ...(options?.localId ? { localId: options.localId } : {}),
  }
}

/**
 * Merge API result with UI-only fields from the upsert input so same-session UX
 * (arrival time, brought-by) stays intact without a backend contract change.
 */
export function mergeUiFieldsOntoAttendance(
  apiRecord: AttendanceViewModel,
  input: AttendanceUpsertInput,
): AttendanceViewModel {
  if (!input.present) {
    return {
      ...apiRecord,
      present: false,
      arrivedAt: undefined,
      broughtBy: undefined,
      broughtByOther: undefined,
      absentReason: input.absentReason ?? apiRecord.absentReason,
      notes: input.notes?.trim() ? input.notes.trim() : apiRecord.notes,
      recordedBy: input.recordedBy ?? apiRecord.recordedBy,
    }
  }

  return {
    ...apiRecord,
    present: true,
    arrivedAt: input.arrivedAt ?? apiRecord.arrivedAt ?? new Date().toISOString(),
    broughtBy: input.broughtBy ?? apiRecord.broughtBy,
    broughtByOther: input.broughtByOther ?? apiRecord.broughtByOther,
    absentReason: undefined,
    notes: input.notes?.trim() ? input.notes.trim() : undefined,
    recordedBy: input.recordedBy ?? apiRecord.recordedBy,
  }
}

/** Narrow AttendanceRecord → AttendanceViewModel when version/centerId are known. */
export function asAttendanceViewModel(record: AttendanceRecord): AttendanceViewModel {
  const version =
    'version' in record && typeof (record as AttendanceViewModel).version === 'number'
      ? (record as AttendanceViewModel).version
      : 0
  const centerId =
    'centerId' in record && typeof (record as AttendanceViewModel).centerId === 'string'
      ? (record as AttendanceViewModel).centerId
      : ''
  return { ...record, version, centerId }
}
