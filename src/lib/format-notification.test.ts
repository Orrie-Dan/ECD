import { describe, expect, it } from 'vitest'
import { formatNotification } from '@/lib/format-notification'
import type { NotificationViewModel } from '@/models/notifications'

function notification(
  overrides: Partial<NotificationViewModel> = {},
): NotificationViewModel {
  return {
    id: 'n1',
    type: 'transfer_accepted',
    title: 'Transfer accepted',
    message: 'Transfer was accepted',
    priority: 'medium',
    isRead: false,
    readAt: null,
    entityType: 'child_transfer',
    entityId: 'transfer-1',
    entity: null,
    context: null,
    action: null,
    metadata: null,
    createdAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  }
}

describe('formatNotification', () => {
  it('uses nameless transfer copy instead of "kwa" with a gap', () => {
    const copy = formatNotification(notification())
    expect(copy.title).toBe('Kwimura kwemerewe')
    expect(copy.message).toBe('Kwimura byemerewe')
    expect(copy.message).not.toMatch(/\bkwa\b/i)
    expect(copy.message).not.toMatch(/Umwana/i)
  })

  it('uses the local roster child name for transfer accepted', () => {
    const copy = formatNotification(
      notification({
        metadata: { childId: 'child-paul', childName: 'S59A Child-x' },
      }),
      [{ id: 'child-paul', fullName: 'Paul Victor' }],
    )
    expect(copy.title).toBe('Kwimura kwemerewe — Paul Victor')
    expect(copy.message).toBe('Kwimura kwa Paul Victor byemerewe')
  })

  it('reads nested metadata child names', () => {
    const copy = formatNotification(
      notification({
        metadata: {
          child: { id: 'child-joel', fullName: 'Joel Habimana' },
        },
      }),
      [{ id: 'child-joel', fullName: 'Joel Habimana' }],
    )
    expect(copy.message).toContain('Joel Habimana')
    expect(copy.message).not.toMatch(/kwa byemerewe/)
  })

  it('extracts a real name from English API text', () => {
    const copy = formatNotification(
      notification({
        type: 'child_enrolled',
        title: 'Child enrolled',
        message: 'Paul Victor was enrolled',
        entityType: 'child',
        entityId: 'x',
        metadata: { childName: 'Paul Victor' },
      }),
    )
    expect(copy.title).toContain('Paul Victor')
    expect(copy.message).toContain('Paul Victor')
    expect(copy.message).not.toMatch(/Umwana|enrolled/i)
  })

  it('formats attendance absence from metadata without leaking referral day counts', () => {
    const copy = formatNotification(
      notification({
        type: 'attendance_absence',
        title: 'Repeated absences',
        message: 'Paul Victor was absent 15 days in the last 7 days.',
        entityType: 'child',
        entityId: 'child-paul',
        metadata: {
          code: 'ATTENDANCE_ABSENCE_RISK',
          childId: 'child-paul',
          childName: 'Paul Victor',
          centerName: 'Center 1',
          absentDays: 4,
          days: 28,
        },
      }),
      [{ id: 'child-paul', fullName: 'Paul Victor' }],
    )
    expect(copy.message).toContain('4')
    expect(copy.message).not.toContain('15')
    expect(copy.message).not.toContain('28')
  })

  it('formats attendance absence from metadata', () => {
    const copy = formatNotification(
      notification({
        type: 'attendance_absence',
        title: 'Repeated absences',
        message: 'Paul Victor was absent 4 days in the last 7 days.',
        entityType: 'child',
        entityId: 'child-paul',
        metadata: {
          code: 'ATTENDANCE_ABSENCE_RISK',
          childId: 'child-paul',
          childName: 'Paul Victor',
          centerName: 'Center 1',
          absentDays: 4,
        },
      }),
      [{ id: 'child-paul', fullName: 'Paul Victor' }],
    )
    expect(copy.title).toContain('Paul Victor')
    expect(copy.message).toContain('Paul Victor')
    expect(copy.message).toContain('4')
    expect(copy.message).not.toMatch(/absent|Repeated/i)
  })

  it('formats center low attendance from metadata', () => {
    const copy = formatNotification(
      notification({
        type: 'attendance_low_rate',
        title: 'Low attendance rate',
        message: 'Center 1 attendance is 64% over the last 7 days.',
        entityType: 'ecd_center',
        entityId: 'c1',
        metadata: {
          code: 'ATTENDANCE_LOW_RATE',
          centerName: 'Center 1',
          rate: 64,
        },
      }),
    )
    expect(copy.title).toBe('Ubwitabire buri hasi')
    expect(copy.message).toContain('Center 1')
    expect(copy.message).toContain('64')
    expect(copy.message).not.toMatch(/attendance is/i)
  })
})
