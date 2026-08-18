import { describe, expect, it } from 'vitest'
import {
  attendanceMinDate,
  clampIsoDate,
  shiftIsoDate,
} from '@/lib/attendance-utils'

describe('attendance date helpers', () => {
  it('shifts across month and year boundaries', () => {
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftIsoDate('2026-08-14', 0)).toBe('2026-08-14')
  })

  it('clamps dates to the inclusive window', () => {
    expect(clampIsoDate('2026-08-01', '2026-07-05', '2026-08-14')).toBe('2026-08-01')
    expect(clampIsoDate('2026-06-01', '2026-07-05', '2026-08-14')).toBe('2026-07-05')
    expect(clampIsoDate('2026-09-01', '2026-07-05', '2026-08-14')).toBe('2026-08-14')
    expect(clampIsoDate('', '2026-07-05', '2026-08-14')).toBe('2026-08-14')
  })

  it('lookback min date is 40 days before the max date', () => {
    expect(attendanceMinDate('2026-08-14')).toBe('2026-07-05')
  })
})
