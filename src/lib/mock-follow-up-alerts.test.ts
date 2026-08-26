import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_ABSENT_THRESHOLD,
  ATTENDANCE_RISK_DAYS,
  buildDefaultCenterMockFollowUpAlerts,
  buildMockFollowUpAlerts,
  LOW_CENTER_ATTENDANCE_THRESHOLD,
} from '@/lib/mock-follow-up-alerts'
import { DEFAULT_CENTER_ID, MOCK_CHILDREN } from '@/lib/mock-data'
import type { AttendanceRecord, Child } from '@/types'

describe('mock follow-up alerts', () => {
  it('flags children absent at least three times in the rolling window', () => {
    const child: Child = {
      ...MOCK_CHILDREN[0],
      id: 'child-absence',
      fullName: 'Test Absence Child',
      centerId: DEFAULT_CENTER_ID,
      centerName: 'ECD Remera',
      status: 'active',
    }
    const attendance: AttendanceRecord[] = [
      { id: 'a1', childId: child.id, date: '2026-08-26', present: false, recordedBy: 'u' },
      { id: 'a2', childId: child.id, date: '2026-08-25', present: false, recordedBy: 'u' },
      { id: 'a3', childId: child.id, date: '2026-08-24', present: false, recordedBy: 'u' },
    ]

    const result = buildMockFollowUpAlerts(
      { centerId: DEFAULT_CENTER_ID, limit: 50 },
      { children: [child], attendance, today: '2026-08-26' },
    )

    const absence = result.items.find((item) => item.code === 'ATTENDANCE_ABSENCE_RISK')
    expect(absence).toBeDefined()
    expect(absence?.childId).toBe(child.id)
    expect(absence?.priority).toBe('medium')
  })

  it('flags low center attendance from computed rates', () => {
    const child: Child = {
      ...MOCK_CHILDREN[0],
      id: 'child-rate',
      centerId: DEFAULT_CENTER_ID,
      centerName: 'ECD Remera',
      status: 'active',
    }
    const attendance: AttendanceRecord[] = [
      { id: 'p1', childId: child.id, date: '2026-08-26', present: false, recordedBy: 'u' },
      { id: 'p2', childId: child.id, date: '2026-08-25', present: false, recordedBy: 'u' },
      { id: 'p3', childId: child.id, date: '2026-08-24', present: true, recordedBy: 'u' },
      { id: 'p4', childId: child.id, date: '2026-08-23', present: false, recordedBy: 'u' },
    ]

    const result = buildMockFollowUpAlerts(
      { centerId: DEFAULT_CENTER_ID, limit: 50 },
      { children: [child], attendance, today: '2026-08-26' },
    )

    const lowRate = result.items.find((item) => item.code === 'ATTENDANCE_LOW_RATE')
    expect(lowRate).toBeDefined()
    expect(lowRate?.centerId).toBe(DEFAULT_CENTER_ID)
  })

  it('builds default centre demo alerts from seeded mock attendance', () => {
    const result = buildDefaultCenterMockFollowUpAlerts({ limit: 20 })
    expect(result.items.length).toBeGreaterThan(0)
    expect(
      result.items.some(
        (item) =>
          item.code === 'ATTENDANCE_ABSENCE_RISK' ||
          item.code === 'ATTENDANCE_LOW_RATE' ||
          item.code === 'DQ_NO_ATTENDANCE_TODAY',
      ),
    ).toBe(true)
  })

  it('uses backend-aligned thresholds', () => {
    expect(ATTENDANCE_RISK_DAYS).toBe(7)
    expect(ATTENDANCE_ABSENT_THRESHOLD).toBe(3)
    expect(LOW_CENTER_ATTENDANCE_THRESHOLD).toBe(80)
  })
})
