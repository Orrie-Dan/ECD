import { describe, expect, it } from 'vitest'
import { DEFAULT_ATTENDANCE_SEARCH } from '@/lib/child-filters'
import { buildAttendanceDayRows } from '@/lib/attendance-utils'
import type { AttendanceRecord, Child } from '@/types'

function child(id: string, name: string): Child {
  return {
    id,
    fullName: name,
    dateOfBirth: '2024-01-01',
    gender: 'Umuhungu',
    guardianName: 'Guardian',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi_mama',
    province: 'p',
    district: 'd',
    sector: 's',
    cell: 'c',
    village: 'v',
    registeredAt: '2026-01-01',
    status: 'active',
    registrationNumber: id,
    centerId: 'ctr',
    centerName: 'Center',
  }
}

describe('buildAttendanceDayRows', () => {
  const children = [child('a', 'Ange'), child('b', 'Bosco'), child('c', 'Claire')]
  const date = '2026-08-05'
  const attendance: AttendanceRecord[] = [
    {
      id: '1',
      childId: 'b',
      date,
      present: true,
      arrivedAt: `${date}T08:10:00`,
      recordedBy: 'Umurezi',
    },
    {
      id: '2',
      childId: 'c',
      date,
      present: false,
      absentReason: 'sick',
      recordedBy: 'Umurezi',
    },
    {
      id: '3',
      childId: 'a',
      date: '2026-08-04',
      present: true,
      arrivedAt: '2026-08-04T08:00:00',
      recordedBy: 'Umurezi',
    },
  ]

  it('puts present and absent children before unrecorded so the day is readable', () => {
    const rows = buildAttendanceDayRows({
      children,
      attendance,
      date,
      filters: DEFAULT_ATTENDANCE_SEARCH,
      viewState: 'all',
    })

    expect(rows.map((row) => row.child.id)).toEqual(['b', 'c', 'a'])
    expect(rows.map((row) => row.status)).toEqual(['present', 'absent', 'unrecorded'])
    expect(rows[2]?.previous?.date).toBe('2026-08-04')
  })

  it('filters the roster by view state', () => {
    const present = buildAttendanceDayRows({
      children,
      attendance,
      date,
      filters: DEFAULT_ATTENDANCE_SEARCH,
      viewState: 'arrived',
    })
    const waiting = buildAttendanceDayRows({
      children,
      attendance,
      date,
      filters: DEFAULT_ATTENDANCE_SEARCH,
      viewState: 'waiting',
    })

    expect(present).toHaveLength(1)
    expect(present[0]?.child.id).toBe('b')
    expect(waiting).toHaveLength(1)
    expect(waiting[0]?.child.id).toBe('a')
  })
})
