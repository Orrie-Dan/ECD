import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_RISK_WINDOW_DAYS,
  clampAbsentDaysInWindow,
  parseAbsentDaysFromAlertText,
  parseAbsentDaysFromMetrics,
  resolveAbsentDaysInWindow,
} from '@/lib/attendance-absence-days'

describe('attendance absence day parsing', () => {
  it('parses standard backend copy', () => {
    expect(
      parseAbsentDaysFromAlertText('Paul Victor was absent 4 days in the last 7 days'),
    ).toBe(4)
  })

  it('caps absent days at the rolling window size', () => {
    expect(
      parseAbsentDaysFromAlertText('Paul Victor was absent 15 days in the last 7 days'),
    ).toBe(7)
    expect(clampAbsentDaysInWindow(20, ATTENDANCE_RISK_WINDOW_DAYS)).toBe(7)
  })

  it('ignores unrelated day counts outside the window phrase', () => {
    expect(parseAbsentDaysFromAlertText('Referral pending for 28 days')).toBeNull()
    expect(
      resolveAbsentDaysInWindow({
        description: 'Referral pending for 28 days',
        title: 'Repeated absences',
      }),
    ).toBe(3)
  })

  it('prefers metrics absent count and caps them', () => {
    expect(
      parseAbsentDaysFromMetrics([
        { label: 'Absent days', value: '12' },
        { label: 'Window', value: '7 days' },
      ]),
    ).toBe(7)
  })

  it('prefers metadata absentDays for notifications', () => {
    expect(
      resolveAbsentDaysInWindow({
        description: 'Paul Victor was absent 15 days in the last 7 days.',
        metadata: { absentDays: 4, days: 28 },
      }),
    ).toBe(4)
  })
})
