import { describe, it, expect } from 'vitest'
import { monthRange } from '@/lib/contribution-format'
import {
  aggregateAttendanceSummary,
  mapParentingSessionDtoToViewModel,
} from '@/api/mappers/parenting-sessions.mapper'
import {
  deriveTotalAttendees,
  formatAttendeeCount,
  validateAttendeeCount,
} from '@/lib/parenting-session-format'

describe('FE-3 — parenting sessions helpers', () => {
  it('builds inclusive month date bounds for API from/to', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('maps session DTO with API-derived totalAttendees', () => {
    const vm = mapParentingSessionDtoToViewModel({
      id: 's1',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      sessionDate: '2026-03-10T00:00:00.000Z',
      topic: 'Positive discipline',
      facilitatorName: 'Marie',
      facilitatorRole: 'CHW',
      facilitatorUserId: null,
      messageSummary: 'Summary text',
      maleAttendees: 4,
      femaleAttendees: 12,
      totalAttendees: 16,
      notes: null,
      recordedById: 'u1',
      version: 1,
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T10:00:00.000Z',
    })
    expect(vm.sessionDate).toBe('2026-03-10')
    expect(vm.totalAttendees).toBe(16)
  })

  it('aggregates period attendance from all sessions', () => {
    const sessions = [
      mapParentingSessionDtoToViewModel({
        id: 's1',
        centerId: 'c1',
        centerName: 'Test',
        districtId: 'd1',
        sessionDate: '2026-03-01',
        topic: 'A',
        facilitatorName: 'X',
        facilitatorRole: null,
        facilitatorUserId: null,
        messageSummary: 'm1',
        maleAttendees: 3,
        femaleAttendees: 7,
        totalAttendees: 10,
        notes: null,
        recordedById: 'u1',
        version: 1,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      }),
      mapParentingSessionDtoToViewModel({
        id: 's2',
        centerId: 'c1',
        centerName: 'Test',
        districtId: 'd1',
        sessionDate: '2026-03-15',
        topic: 'B',
        facilitatorName: 'Y',
        facilitatorRole: null,
        facilitatorUserId: null,
        messageSummary: 'm2',
        maleAttendees: 2,
        femaleAttendees: 5,
        totalAttendees: 7,
        notes: null,
        recordedById: 'u1',
        version: 1,
        createdAt: '2026-03-15',
        updatedAt: '2026-03-15',
      }),
    ]

    const summary = aggregateAttendanceSummary(sessions, {
      centerId: 'c1',
      from: '2026-03-01',
      to: '2026-03-31',
    })
    expect(summary.sessionCount).toBe(2)
    expect(summary.maleAttendeesTotal).toBe(5)
    expect(summary.femaleAttendeesTotal).toBe(12)
    expect(summary.totalAttendees).toBe(17)
  })

  it('validates attendee counts and derives totals', () => {
    expect(validateAttendeeCount('-1')).toBeTruthy()
    expect(validateAttendeeCount('abc')).toBeTruthy()
    expect(validateAttendeeCount('4')).toBeNull()
    expect(deriveTotalAttendees('4', '12')).toBe(16)
    expect(formatAttendeeCount(1600)).toContain('1')
  })
})
