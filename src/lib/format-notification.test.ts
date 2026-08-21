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
    isRead: false,
    readAt: null,
    entityType: 'child_transfer',
    entityId: 'transfer-1',
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
})
