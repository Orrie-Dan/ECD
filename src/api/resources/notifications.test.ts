import { describe, it, expect, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { apiClient } from '@/api/client'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/resources/notifications'

describe('notifications API resource', () => {
  it('fetchNotifications calls GET /api/v1/notifications with filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0, unreadCount: 0 },
    })

    await fetchNotifications({ page: 1, pageSize: 8, isRead: false })

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications', {
      params: { page: 1, pageSize: 8, isRead: false },
    })
  })

  it('fetchUnreadCount calls GET unread-count', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { unreadCount: 4 } })

    const result = await fetchUnreadCount()

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/unread-count')
    expect(result.unreadCount).toBe(4)
  })

  it('markNotificationRead posts to read endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'n1', isRead: true },
    })

    await markNotificationRead('n1')

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/n1/read')
  })

  it('markAllNotificationsRead posts to read-all', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { markedCount: 3 } })

    await markAllNotificationsRead()

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/read-all')
  })
})
