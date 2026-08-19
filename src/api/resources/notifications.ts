/**
 * Notifications resource — direct Axios calls (no Orval generation yet).
 * Wraps the /api/v1/notifications endpoints.
 */
import { apiClient } from '@/api/client'
import type {
  NotificationListViewModel,
  NotificationViewModel,
  NotificationListFilters,
} from '@/models/notifications'

export type { NotificationListFilters }

export async function fetchNotifications(
  filters: NotificationListFilters = {},
): Promise<NotificationListViewModel> {
  const { data } = await apiClient.get<NotificationListViewModel>(
    '/api/v1/notifications',
    {
      params: {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
        ...(filters.type && { type: filters.type }),
        ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      },
    },
  )
  return data
}

export async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.get<{ unreadCount: number }>(
    '/api/v1/notifications/unread-count',
  )
  return data
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationViewModel> {
  const { data } = await apiClient.post<NotificationViewModel>(
    `/api/v1/notifications/${id}/read`,
  )
  return data
}

export async function markAllNotificationsRead(): Promise<{ markedCount: number }> {
  const { data } = await apiClient.post<{ markedCount: number }>(
    '/api/v1/notifications/read-all',
  )
  return data
}
