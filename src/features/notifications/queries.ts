import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { notifications, queryStaleTimes } from '@/api/query-keys'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationListFilters,
} from '@/api/resources/notifications'

export function useNotifications(filters: NotificationListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: notifications.keys.list(filters as Record<string, unknown>),
    queryFn: () => fetchNotifications(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.notifications,
  })
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notifications.keys.unreadCount(),
    queryFn: fetchUnreadCount,
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.notificationsUnread,
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notifications.keys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notifications.keys.all })
    },
  })
}
