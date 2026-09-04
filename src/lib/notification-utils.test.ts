import { describe, expect, it } from 'vitest'
import {
  applyMarkAllReadToList,
  applyMarkReadToList,
  formatNotificationContext,
  formatUnreadBadge,
  getNotificationActionPath,
  getPriorityAccentClass,
  getPriorityBadgeVariant,
} from '@/lib/notification-utils'
import type { NotificationListViewModel, NotificationViewModel } from '@/models/notifications'

function notification(overrides: Partial<NotificationViewModel> = {}): NotificationViewModel {
  return {
    id: 'n1',
    type: 'nutrition_alert',
    title: 'Severe nutrition status',
    message: 'A child has been screened with severe nutrition status.',
    priority: 'critical',
    isRead: false,
    readAt: null,
    entityType: 'child_nutrition_screening',
    entityId: 'screening-uuid',
    entity: { type: 'child_nutrition_screening', id: 'screening-uuid' },
    context: {
      child: { id: 'child-uuid', name: 'Jane Doe' },
      center: { id: 'center-uuid', name: 'Kigali ECD Center' },
      district: { id: 'district-uuid', name: 'Gasabo' },
    },
    action: { type: 'route', path: '/children/child-uuid' },
    metadata: null,
    createdAt: '2026-09-02T12:00:00.000Z',
    ...overrides,
  }
}

function list(items: NotificationViewModel[], unreadCount = items.filter((i) => !i.isRead).length): NotificationListViewModel {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    unreadCount,
  }
}

describe('formatUnreadBadge', () => {
  it('shows count for 1–9 unread', () => {
    expect(formatUnreadBadge(4)).toBe('4')
  })

  it('omits badge at zero', () => {
    expect(formatUnreadBadge(0)).toBeNull()
  })

  it('caps at 99+', () => {
    expect(formatUnreadBadge(100)).toBe('99+')
  })
})

describe('getNotificationActionPath', () => {
  it('returns remapped role path when rolePrefix is provided', () => {
    expect(getNotificationActionPath(notification(), '/ncda')).toBe('/ncda/children/child-uuid')
    expect(getNotificationActionPath(notification(), '/district')).toBe('/district/abana/child-uuid')
    expect(getNotificationActionPath(notification(), '/caretaker')).toBe('/caretaker/abana/child-uuid')
  })

  it('returns backend action path when rolePrefix is omitted', () => {
    expect(getNotificationActionPath(notification())).toBe('/children/child-uuid')
  })

  it('returns null when action is missing', () => {
    expect(getNotificationActionPath(notification({ action: null }))).toBeNull()
  })
})

describe('formatNotificationContext', () => {
  it('renders structured child, center, and district', () => {
    expect(formatNotificationContext(notification())).toBe(
      'Jane Doe · Kigali ECD Center · Gasabo',
    )
  })

  it('returns null when context is empty', () => {
    expect(formatNotificationContext(notification({ context: null }))).toBeNull()
  })
})

describe('priority styling', () => {
  it('maps critical to danger badge variant', () => {
    expect(getPriorityBadgeVariant('critical')).toBe('danger')
  })

  it('applies accent class for critical notifications', () => {
    expect(getPriorityAccentClass('critical')).toContain('border-l-error')
  })
})

describe('optimistic list updates', () => {
  it('marks one notification read and decrements unread count', () => {
    const updated = applyMarkReadToList(list([notification()]), 'n1', '2026-09-02T13:00:00.000Z')
    expect(updated.items[0]?.isRead).toBe(true)
    expect(updated.unreadCount).toBe(0)
  })

  it('marks all notifications read', () => {
    const updated = applyMarkAllReadToList(
      list([
        notification(),
        notification({ id: 'n2', isRead: true, readAt: '2026-09-01T10:00:00.000Z' }),
      ], 1),
      '2026-09-02T13:00:00.000Z',
    )
    expect(updated.items.every((item) => item.isRead)).toBe(true)
    expect(updated.unreadCount).toBe(0)
  })
})
