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
import {
  applyMarkAllReadToList,
  applyMarkReadToList,
} from '@/lib/notification-utils'
import type { NotificationListViewModel } from '@/models/notifications'

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
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notifications.keys.all })

      const previousUnread = qc.getQueryData<{ unreadCount: number }>(
        notifications.keys.unreadCount(),
      )
      const readAt = new Date().toISOString()

      if (previousUnread && previousUnread.unreadCount > 0) {
        qc.setQueryData(notifications.keys.unreadCount(), {
          unreadCount: previousUnread.unreadCount - 1,
        })
      }

      qc.setQueriesData<NotificationListViewModel>(
        { queryKey: notifications.keys.lists() },
        (old) => (old ? applyMarkReadToList(old, id, readAt) : old),
      )

      return { previousUnread }
    },
    onError: (_error, _id, context) => {
      if (context?.previousUnread) {
        qc.setQueryData(notifications.keys.unreadCount(), context.previousUnread)
      }
      void qc.invalidateQueries({ queryKey: notifications.keys.all })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notifications.keys.unreadCount() })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notifications.keys.all })

      const previousUnread = qc.getQueryData<{ unreadCount: number }>(
        notifications.keys.unreadCount(),
      )
      const readAt = new Date().toISOString()

      qc.setQueryData(notifications.keys.unreadCount(), { unreadCount: 0 })

      qc.setQueriesData<NotificationListViewModel>(
        { queryKey: notifications.keys.lists() },
        (old) => (old ? applyMarkAllReadToList(old, readAt) : old),
      )

      return { previousUnread }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousUnread) {
        qc.setQueryData(notifications.keys.unreadCount(), context.previousUnread)
      }
      void qc.invalidateQueries({ queryKey: notifications.keys.all })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notifications.keys.all })
    },
  })
}
