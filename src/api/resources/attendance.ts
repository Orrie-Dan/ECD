/**
 * Attendance resource layer — wraps generated OpenAPI client + mappers.
 * Feature hooks import from here; UI never imports Attendance*Dto types.
 */
import {
  attendanceControllerCreateBatch,
  attendanceControllerFindAll,
  attendanceControllerSoftDelete,
} from '@/api/generated/endpoints/attendance/attendance'
import { normalizeApiError } from '@/api/errors'
import {
  mapAttendanceDtoToViewModel,
  mapPaginatedAttendanceToViewModel,
  mapUpsertToBatchRecord,
  mergeUiFieldsOntoAttendance,
} from '@/api/mappers/attendance.mapper'
import type {
  AttendanceListFilters,
  AttendanceListResult,
  AttendanceUpsertInput,
  AttendanceViewModel,
} from '@/models/attendance'

export async function fetchAttendanceList(
  filters: AttendanceListFilters = {},
): Promise<AttendanceListResult> {
  const dto = await attendanceControllerFindAll({
    centerId: filters.centerId,
    childId: filters.childId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 200,
  })
  return mapPaginatedAttendanceToViewModel(dto)
}

/** Fetch all pages for a filter window (pageSize capped at 200 by API). */
export async function fetchAllAttendance(
  filters: Omit<AttendanceListFilters, 'page' | 'pageSize'> = {},
): Promise<AttendanceViewModel[]> {
  const pageSize = 200
  let page = 1
  let totalPages = 1
  const items: AttendanceViewModel[] = []

  do {
    const result = await fetchAttendanceList({ ...filters, page, pageSize })
    items.push(...result.items)
    totalPages = Math.max(1, result.totalPages)
    page += 1
  } while (page <= totalPages)

  return items
}

export async function upsertAttendanceRequest(
  input: AttendanceUpsertInput,
  options?: { centerId?: string },
): Promise<AttendanceViewModel> {
  const body = {
    centerId: options?.centerId ?? input.centerId,
    records: [
      mapUpsertToBatchRecord(input, {
        version: input.version,
      }),
    ],
  }

  const result = await attendanceControllerCreateBatch(body)
  const item = result.items[0]

  if (!item) {
    throw normalizeApiError(new Error('Attendance batch returned no items'))
  }

  if (item.outcome === 'conflict') {
    const err = normalizeApiError(
      new Error(item.message ?? 'Attendance record was updated elsewhere. Refresh and try again.'),
    )
    throw {
      ...err,
      statusCode: 409,
      isConflict: true,
      code: 'ATTENDANCE_CONFLICT',
      raw: item,
    }
  }

  if (item.outcome === 'failed' || item.outcome === 'forbidden' || item.outcome === 'not_found') {
    throw normalizeApiError(new Error(item.message ?? `Attendance ${item.outcome}`))
  }

  if (!item.attendance) {
    throw normalizeApiError(new Error('Attendance batch succeeded without attendance payload'))
  }

  const mapped = mapAttendanceDtoToViewModel(item.attendance)
  return mergeUiFieldsOntoAttendance(mapped, input)
}

export async function softDeleteAttendanceRequest(
  record: AttendanceViewModel,
): Promise<AttendanceViewModel> {
  const dto = await attendanceControllerSoftDelete(record.id, { version: record.version })
  return mapAttendanceDtoToViewModel(dto)
}
