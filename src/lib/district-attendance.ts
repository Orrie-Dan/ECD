import type { AttendanceDayStatus, AttendanceRecord, Child, EcdCenter } from '@/types'
import {
  computeAttendanceSummary,
  getCenterRangeAttendanceRate,
  getDayStatus,
  getTodayDate,
  type AttendanceSummaryStats,
} from '@/lib/attendance-utils'
import { ATTENDANCE_THRESHOLD } from '@/lib/mock-data'

export type CenterSubmissionStatus = 'submitted' | 'missing' | 'partial'

export interface CenterDailyAttendanceRow {
  center: EcdCenter
  status: CenterSubmissionStatus
  rate: number
  childrenCount: number
  present: number
  absent: number
  unrecorded: number
}

export interface CenterChildDayRow {
  id: string
  fullName: string
  guardianName?: string
  status: AttendanceDayStatus
  isSynthetic: boolean
}

function centerSeed(centerId: string, date: string): number {
  const idNum = Number.parseInt(centerId.replace(/\D/g, ''), 10) || 1
  const dateNum = Number.parseInt(date.replace(/\D/g, ''), 10) || 0
  return idNum * 17 + (dateNum % 97)
}

/** Derive daily submission status for a centre (mock-friendly). */
export function getCenterSubmissionStatus(
  center: EcdCenter,
  date: string,
  today = getTodayDate(),
): CenterSubmissionStatus {
  const seed = centerSeed(center.id, date)

  if (date === today) {
    if (!center.submittedToday) return 'missing'
    if (center.attendance < ATTENDANCE_THRESHOLD || seed % 5 === 0) return 'partial'
    return 'submitted'
  }

  if (seed % 6 === 0) return 'missing'
  if (seed % 4 === 0 || center.attendance < ATTENDANCE_THRESHOLD) return 'partial'
  return 'submitted'
}

function breakdownForStatus(
  childrenCount: number,
  rate: number,
  status: CenterSubmissionStatus,
  seed: number,
): Pick<CenterDailyAttendanceRow, 'present' | 'absent' | 'unrecorded' | 'rate'> {
  if (status === 'missing') {
    return { present: 0, absent: 0, unrecorded: childrenCount, rate: 0 }
  }

  if (status === 'submitted') {
    const present = Math.round((childrenCount * rate) / 100)
    return {
      present,
      absent: Math.max(0, childrenCount - present),
      unrecorded: 0,
      rate,
    }
  }

  // partial: some children still unrecorded
  const recordedRatio = 0.55 + (seed % 25) / 100
  const recorded = Math.max(1, Math.min(childrenCount - 1, Math.round(childrenCount * recordedRatio)))
  const unrecorded = childrenCount - recorded
  const present = Math.round((recorded * rate) / 100)
  const absent = Math.max(0, recorded - present)
  const effectiveRate = childrenCount > 0 ? Math.round((present / childrenCount) * 100) : 0

  return { present, absent, unrecorded, rate: effectiveRate }
}

export function buildCenterDailyAttendanceRows(
  centers: EcdCenter[],
  date: string,
  today = getTodayDate(),
): CenterDailyAttendanceRow[] {
  return centers
    .map((center) => {
      const status = getCenterSubmissionStatus(center, date, today)
      const baseRate = getCenterRangeAttendanceRate(center, date, date)
      const seed = centerSeed(center.id, date)
      const counts = breakdownForStatus(center.children, baseRate, status, seed)
      return {
        center,
        status,
        childrenCount: center.children,
        ...counts,
      }
    })
    .sort((a, b) => {
      const order = { missing: 0, partial: 1, submitted: 2 } as const
      return order[a.status] - order[b.status] || a.center.name.localeCompare(b.center.name, 'rw')
    })
}

export function summarizeSubmissionStatuses(rows: CenterDailyAttendanceRow[]) {
  let submitted = 0
  let missing = 0
  let partial = 0
  for (const row of rows) {
    if (row.status === 'submitted') submitted++
    else if (row.status === 'missing') missing++
    else partial++
  }
  return { submitted, missing, partial, total: rows.length }
}

export function buildCenterChildDayRowsFromContext(
  children: Child[],
  attendance: AttendanceRecord[],
  centerId: string,
  date: string,
): { rows: CenterChildDayRow[]; stats: AttendanceSummaryStats } | null {
  const centerChildren = children.filter(
    (child) => child.centerId === centerId && child.status === 'active',
  )
  if (centerChildren.length === 0) return null

  const rows: CenterChildDayRow[] = centerChildren
    .map((child) => ({
      id: child.id,
      fullName: child.fullName,
      guardianName: child.guardianName,
      status: getDayStatus(attendance, child.id, date),
      isSynthetic: false,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'rw'))

  return {
    rows,
    stats: computeAttendanceSummary(centerChildren, attendance, date, { includeLate: false }),
  }
}

/** Synthetic roster when Context has no children for the centre. */
export function buildSyntheticCenterChildDayRows(
  row: CenterDailyAttendanceRow,
): { rows: CenterChildDayRow[]; stats: AttendanceSummaryStats } {
  const { present, absent, unrecorded, childrenCount, rate } = row
  const rows: CenterChildDayRow[] = []
  let index = 1

  for (let i = 0; i < present; i++) {
    rows.push({
      id: `${row.center.id}-p-${i}`,
      fullName: `Umwana ${index++}`,
      status: 'present',
      isSynthetic: true,
    })
  }
  for (let i = 0; i < absent; i++) {
    rows.push({
      id: `${row.center.id}-a-${i}`,
      fullName: `Umwana ${index++}`,
      status: 'absent',
      isSynthetic: true,
    })
  }
  for (let i = 0; i < unrecorded; i++) {
    rows.push({
      id: `${row.center.id}-u-${i}`,
      fullName: `Umwana ${index++}`,
      status: 'unrecorded',
      isSynthetic: true,
    })
  }

  return {
    rows,
    stats: {
      total: childrenCount,
      present,
      absent,
      unrecorded,
      rate,
      lateArrivals: null,
    },
  }
}
