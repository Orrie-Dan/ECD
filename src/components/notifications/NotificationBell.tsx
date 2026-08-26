import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ArrowRightLeft,
  UserPlus,
  Archive,
  Apple,
  Stethoscope,
  ClipboardCheck,
  Users,
  FileWarning,
  CalendarDays,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { env } from '@/config/env'
import {
  useUnreadCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications'
import { useData } from '@/contexts/AppContext'
import { getNotificationLink } from '@/lib/notification-links'
import { formatNotification } from '@/lib/format-notification'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import type { NotificationType, NotificationViewModel } from '@/models/notifications'

const typeIcons: Record<NotificationType, LucideIcon> = {
  transfer_request: ArrowRightLeft,
  transfer_accepted: ArrowRightLeft,
  transfer_cancelled: ArrowRightLeft,
  child_enrolled: UserPlus,
  child_archived: Archive,
  assessment_due: ClipboardCheck,
  referral_created: Stethoscope,
  referral_updated: Stethoscope,
  nutrition_alert: Apple,
  sted_followup: ClipboardCheck,
  compliance_update: FileWarning,
  capacity_warning: Users,
  attendance_absence: CalendarDays,
  attendance_low_rate: CalendarDays,
  general: Bell,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return t.timeAgo.justNow
  if (mins < 60) return t.timeAgo.minutesAgo.replace('{count}', String(mins))
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t.timeAgo.hoursAgo.replace('{count}', String(hrs))
  const days = Math.floor(hrs / 24)
  return t.timeAgo.daysAgo.replace('{count}', String(days))
}

interface NotificationBellProps {
  rolePrefix: string
}

export function NotificationBell({ rolePrefix }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { children } = useData()

  const { data: unread } = useUnreadCount(env.isLive)
  const { data: recent } = useNotifications({ page: 1, pageSize: 8 }, env.isLive && open)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const count = unread?.unreadCount ?? 0

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
    navigate(getNotificationLink(n.entityType, n.entityId, rolePrefix, n.type))
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
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[11px] font-bold leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-surface rounded-xl border border-border shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-body font-bold text-text">{t.title}</h3>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1.5 text-caption font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
              >
                <Check size={14} />
                {t.markAllRead}
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto divide-y divide-border">
            {(recent?.items ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={28} className="mx-auto text-text-muted mb-2" />
                <p className="text-body text-text-secondary">{t.empty}</p>
                <p className="text-caption text-text-muted mt-1">{t.emptyDesc}</p>
              </div>
            ) : (
              recent?.items.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell
                const copy = formatNotification(n, children)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background-subtle transition-colors ${
                      !n.isRead ? 'bg-primary-light/10' : ''
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5 ${
                        !n.isRead ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-muted'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-body truncate ${!n.isRead ? 'font-semibold text-text' : 'text-text-secondary'}`}>
                        {copy.title}
                      </p>
                      <p className="text-caption text-text-muted truncate mt-0.5">{copy.message}</p>
                      <p className="text-caption text-text-muted mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(`${rolePrefix}/amatangazo`)
              }}
              className="w-full text-center text-caption font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              {t.viewAll}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
