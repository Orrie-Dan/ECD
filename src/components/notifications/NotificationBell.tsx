import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { env } from '@/config/env'
import {
  useUnreadCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications'
import { NotificationInboxPanel } from '@/components/notifications/NotificationInboxPanel'
import {
  formatUnreadBadge,
  getNotificationActionPath,
} from '@/lib/notification-utils'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import type { NotificationViewModel } from '@/models/notifications'

interface NotificationBellProps {
  rolePrefix: string
}

export function NotificationBell({ rolePrefix }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const {
    data: unread,
    isError: unreadError,
  } = useUnreadCount(env.isLive)
  const {
    data: recent,
    isLoading,
    isError: listError,
    refetch,
  } = useNotifications({ page: 1, pageSize: 8 }, env.isLive && open)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const count = unread?.unreadCount ?? 0
  const badge = unreadError ? null : formatUnreadBadge(count)

  useEffect(() => {
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  if (!env.isLive) return null

  function handleClick(n: NotificationViewModel) {
    if (!n.isRead) markRead.mutate(n.id)
    setOpen(false)
    const path = getNotificationActionPath(n, rolePrefix)
    if (path) navigate(path)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="touch-target relative flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:bg-background-subtle transition-colors"
        aria-label={t.bell}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[11px] font-bold leading-none">
            {badge}
          </span>
        )}
      </button>

      <NotificationInboxPanel
        open={open}
        onClose={() => setOpen(false)}
        unreadCount={count}
        items={recent?.items ?? []}
        isLoading={isLoading}
        isError={listError}
        onRetry={() => void refetch()}
        onItemClick={handleClick}
        onMarkAllRead={() => markAllRead.mutate()}
        markAllPending={markAllRead.isPending}
        onViewAll={() => {
          setOpen(false)
          navigate(`${rolePrefix}/amatangazo`)
        }}
      />
    </div>
  )
}
