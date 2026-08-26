import {
  attendanceAutoAbsentMetaKey,
  datesReadyForAutoAbsent,
  DEFAULT_ATTENDANCE_CUTOFF_TIME,
} from '@/lib/attendance-cutoff'
import { upsertAttendanceLocalFirst } from '@/features/attendance/local-attendance'
import type { LocalStore } from '@/storage/local-store'
import type { AbsentReason, AttendanceRecord, Child } from '@/types'

/** Absent reason used when the system closes the day without a manual entry. */
export const AUTO_ABSENT_REASON: AbsentReason = 'unknown'

export interface AutoAbsentRunResult {
  appliedDates: string[]
  markedCount: number
}

type AttendanceDateLookup = Pick<AttendanceRecord, 'childId' | 'date'>

export function findUnrecordedChildIds(
  enrolledChildIds: string[],
  attendance: AttendanceDateLookup[],
  date: string,
): string[] {
  return enrolledChildIds.filter(
    (childId) => !attendance.some((record) => record.childId === childId && record.date === date),
  )
}

async function wasAutoAbsentApplied(
  store: LocalStore,
  centerId: string,
  date: string,
): Promise<boolean> {
  const value = await store.getMeta(attendanceAutoAbsentMetaKey(centerId, date))
  return value === '1'
}

async function markAutoAbsentApplied(
  store: LocalStore,
  centerId: string,
  date: string,
): Promise<void> {
  await store.setMeta(attendanceAutoAbsentMetaKey(centerId, date), '1')
}

/**
 * LIVE path: mark enrolled children without a record as absent after cutoff.
 * Idempotent per center+date via durable meta keys.
 */
export async function runAttendanceAutoAbsentIfDue(
  store: LocalStore,
  params: {
    centerId: string
    recordedByUserId: string
    cutoffTime?: string
    now?: Date
    lookbackDays?: number
  },
): Promise<AutoAbsentRunResult> {
  const cutoff = params.cutoffTime ?? DEFAULT_ATTENDANCE_CUTOFF_TIME
  const now = params.now ?? new Date()
  const dates = datesReadyForAutoAbsent(now, cutoff, params.lookbackDays)
  if (dates.length === 0) return { appliedDates: [], markedCount: 0 }

  const enrolledChildren = await store.listChildren({ centerId: params.centerId })
  const enrolledChildIds = enrolledChildren
    .filter((child) => child.status === 'active' && !child.deletedAt)
    .map((child) => child.id)

  if (enrolledChildIds.length === 0) return { appliedDates: [], markedCount: 0 }

  const appliedDates: string[] = []
  let markedCount = 0

  for (const date of dates) {
    if (await wasAutoAbsentApplied(store, params.centerId, date)) continue

    const records = await store.listAttendance({
      centerId: params.centerId,
      startDate: date,
      endDate: date,
    })
    const unrecorded = findUnrecordedChildIds(enrolledChildIds, records, date)

    if (unrecorded.length === 0) {
      await markAutoAbsentApplied(store, params.centerId, date)
      continue
    }

    for (const childId of unrecorded) {
      await upsertAttendanceLocalFirst(store, {
        childId,
        date,
        present: false,
        absentReason: AUTO_ABSENT_REASON,
        centerId: params.centerId,
        recordedBy: params.recordedByUserId,
      })
      markedCount++
    }

    await markAutoAbsentApplied(store, params.centerId, date)
    appliedDates.push(date)
  }

  return { appliedDates, markedCount }
}

const mockAppliedDates = new Set<string>()

export function resetMockAutoAbsentStateForTests(): void {
  mockAppliedDates.clear()
}

function mockAutoAbsentKey(centerId: string, date: string): string {
  return `${centerId}:${date}`
}

/**
 * MOCK path: same policy as LIVE, using in-memory attendance via recordAttendance.
 */
export async function runMockAttendanceAutoAbsentIfDue(params: {
  centerId: string
  recordedBy: string
  children: Child[]
  attendance: AttendanceRecord[]
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>
  cutoffTime?: string
  now?: Date
  lookbackDays?: number
}): Promise<AutoAbsentRunResult> {
  const cutoff = params.cutoffTime ?? DEFAULT_ATTENDANCE_CUTOFF_TIME
  const now = params.now ?? new Date()
  const dates = datesReadyForAutoAbsent(now, cutoff, params.lookbackDays)
  const workingAttendance = [...params.attendance]
  const enrolledChildIds = params.children
    .filter((child) => child.status === 'active' && child.centerId === params.centerId)
    .map((child) => child.id)

  if (enrolledChildIds.length === 0) return { appliedDates: [], markedCount: 0 }

  const appliedDates: string[] = []
  let markedCount = 0

  for (const date of dates) {
    const key = mockAutoAbsentKey(params.centerId, date)
    if (mockAppliedDates.has(key)) continue

    const unrecorded = findUnrecordedChildIds(
      enrolledChildIds,
      workingAttendance,
      date,
    )

    if (unrecorded.length === 0) {
      mockAppliedDates.add(key)
      continue
    }

    for (const childId of unrecorded) {
      const record = {
        childId,
        date,
        present: false,
        absentReason: AUTO_ABSENT_REASON,
        recordedBy: params.recordedBy,
      }
      await params.recordAttendance(record)
      workingAttendance.push({ ...record, id: `${childId}-${date}` })
      markedCount++
    }

    mockAppliedDates.add(key)
    appliedDates.push(date)
  }

  return { appliedDates, markedCount }
}
