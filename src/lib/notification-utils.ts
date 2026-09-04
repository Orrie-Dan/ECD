import { notificationsLocale as t } from '@/locales/rw/notifications'
import type {
  NotificationListViewModel,
  NotificationPriority,
  NotificationViewModel,
} from '@/models/notifications'
import type { BadgeVariant } from '@/components/ui/Badge'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'

/** Badge text for unread count; null when no badge should render. */
export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null
  if (count > 99) return '99+'
  return String(count)
}

/**
 * Map backend generic action paths onto the current role's SPA routes.
 * Entity keys in the path may still be UUIDs until public identifiers exist
 * (children) or until the producer emits center/district codes.
 */
export function remapNotificationActionPath(
  path: string,
  rolePrefix: string,
): string {
  const prefix = rolePrefix.replace(/\/$/, '') || '/caretaker'
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return trimmed

  const childMatch = trimmed.match(/^\/children\/([^/?#]+)(.*)$/i)
  if (childMatch) {
    const key = childMatch[1]
    const rest = childMatch[2] ?? ''
    if (prefix === '/ncda') return `${NCDA_PATHS.children}/${key}${rest}`
    if (prefix === '/district') return `${DISTRICT_PATHS.children}/${key}${rest}`
    return `${CARETAKER_PATHS.children}/${key}${rest}`
  }

  const centerMatch = trimmed.match(/^\/centers\/([^/?#]+)(.*)$/i)
  if (centerMatch) {
    const key = centerMatch[1]
    const rest = centerMatch[2] ?? ''
    if (prefix === '/ncda') return `${NCDA_PATHS.centers}/${key}${rest}`
    if (prefix === '/district') return `${DISTRICT_PATHS.centers}/${key}${rest}`
    return CARETAKER_PATHS.attendance
  }

  const referralMatch = trimmed.match(/^\/referrals\/([^/?#]+)(.*)$/i)
  if (referralMatch) {
    if (prefix === '/ncda') return NCDA_PATHS.followUp
    if (prefix === '/district') return `${DISTRICT_PATHS.followup}/ivuriro`
    return CARETAKER_PATHS.alerts
  }

  const transferMatch = trimmed.match(/^\/transfers\/([^/?#]+)(.*)$/i)
  if (transferMatch) {
    if (prefix === '/caretaker') return CARETAKER_PATHS.transfers
    if (prefix === '/district') return DISTRICT_PATHS.followup
    return NCDA_PATHS.followUp
  }

  // Already role-scoped or unknown — pass through.
  return trimmed
}

export function getNotificationActionPath(
  notification: NotificationViewModel,
  rolePrefix?: string,
): string | null {
  const path = notification.action?.path?.trim()
  if (!path) return null
  if (!rolePrefix) return path
  return remapNotificationActionPath(path, rolePrefix)
}

/** Structured context line — child · center · district (no message parsing). */
export function formatNotificationContext(
  notification: NotificationViewModel,
): string | null {
  const parts: string[] = []
  const ctx = notification.context

  if (ctx?.child?.name?.trim()) parts.push(ctx.child.name.trim())
  if (ctx?.center?.name?.trim()) parts.push(ctx.center.name.trim())
  if (ctx?.district?.name?.trim()) parts.push(ctx.district.name.trim())

  return parts.length > 0 ? parts.join(' · ') : null
}

export function formatNotificationTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return t.timeAgo.justNow
  if (mins < 60) return t.timeAgo.minutesAgo.replace('{count}', String(mins))
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t.timeAgo.hoursAgo.replace('{count}', String(hrs))
  const days = Math.floor(hrs / 24)
  return t.timeAgo.daysAgo.replace('{count}', String(days))
}

export function getPriorityLabel(priority: NotificationPriority): string {
  return t.priority[priority] ?? t.priority.medium
}

export function getPriorityBadgeVariant(priority: NotificationPriority): BadgeVariant {
  switch (priority) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
    default:
      return 'neutral'
  }
}

/** Subtle accent for list rows — not four aggressive card styles. */
export function getPriorityAccentClass(priority: NotificationPriority): string {
  switch (priority) {
    case 'critical':
      return 'border-l-2 border-l-error'
    case 'high':
      return 'border-l-2 border-l-warning'
    case 'medium':
      return 'border-l-2 border-l-secondary/60'
    case 'low':
    default:
      return 'border-l-2 border-l-transparent'
  }
}

export function applyMarkReadToList(
  list: NotificationListViewModel,
  id: string,
  readAt: string,
): NotificationListViewModel {
  let decremented = false
  const items = list.items.map((item) => {
    if (item.id !== id || item.isRead) return item
    decremented = true
    return { ...item, isRead: true, readAt }
  })
  return {
    ...list,
    items,
    unreadCount: decremented ? Math.max(0, list.unreadCount - 1) : list.unreadCount,
  }
}

export function applyMarkAllReadToList(
  list: NotificationListViewModel,
  readAt: string,
): NotificationListViewModel {
  return {
    ...list,
    items: list.items.map((item) =>
      item.isRead ? item : { ...item, isRead: true, readAt },
    ),
    unreadCount: 0,
  }
}
