import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import { fetchAllAttendance, fetchAttendanceList } from '@/api/resources/attendance'
import { fetchChildrenList } from '@/api/resources/children'
import { getDayStatus, computeAttendanceSummary } from '@/lib/attendance-utils'
import type { CenterChildDayRow } from '@/lib/district-attendance'
import type { AttendanceListFilters } from '@/models/attendance'
import type { AttendanceSummaryStats } from '@/lib/attendance-utils'
import type { Child } from '@/types'

/**
 * District LIVE operational attendance — GET /api/v1/attendance only.
 * Never hydrates caregiver offline store or DataProvider context.
 */
export function useDistrictAttendanceList(
  filters: AttendanceListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: district.keys.attendance.list(filters),
    queryFn: () => fetchAttendanceList(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.attendanceList,
    retry: 0,
  })
}

export interface DistrictCenterDayRosterResult {
  rows: CenterChildDayRow[]
  stats: AttendanceSummaryStats
  childrenTotal: number
  childrenPage: number
  childrenPageSize: number
  childrenTotalPages: number
  attendanceTotal: number
}

/**
 * Scoped center+day roster: paginated children for the center joined with
 * attendance records for that day. Attendance is fully fetched for the day
 * (tight scope — not district-wide). Children remain server-paginated.
 */
export function useDistrictCenterDayAttendanceRoster(
  input: {
    centerId: string | null
    date: string
    page?: number
    pageSize?: number
  },
  enabled = true,
) {
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 50
  const centerId = input.centerId
  const date = input.date

  return useQuery({
    queryKey: district.keys.attendance.centerDay(centerId ?? '', date, page),
    queryFn: async (): Promise<DistrictCenterDayRosterResult> => {
      const [childrenPage, attendanceRecords] = await Promise.all([
        fetchChildrenList({
          centerId: centerId!,
          status: 'active',
          page,
          pageSize,
        }),
        fetchAllAttendance({
          centerId: centerId!,
          startDate: date,
          endDate: date,
        }),
      ])

      const rows: CenterChildDayRow[] = childrenPage.items
        .map((child) => ({
          id: child.id,
          fullName: child.fullName,
          guardianName: child.guardianName,
          status: getDayStatus(attendanceRecords, child.id, date),
          isSynthetic: false,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'rw'))

      const stats = computeAttendanceSummary(
        childrenPage.items as Child[],
        attendanceRecords,
        date,
        { includeLate: false },
      )

      return {
        rows,
        stats,
        childrenTotal: childrenPage.total,
        childrenPage: childrenPage.page,
        childrenPageSize: childrenPage.pageSize,
        childrenTotalPages: childrenPage.totalPages,
        attendanceTotal: attendanceRecords.length,
      }
    },
    enabled: env.isLive && enabled && !!centerId && !!date,
    staleTime: queryStaleTimes.attendanceList,
    retry: 0,
  })
}
