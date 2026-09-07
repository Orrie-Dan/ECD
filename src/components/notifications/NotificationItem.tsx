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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  formatNotificationContext,
  formatNotificationTimeAgo,
  getPriorityAccentClass,
  getPriorityBadgeVariant,
  getPriorityLabel,
} from '@/lib/notification-utils'
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

function resolveIcon(type: string): LucideIcon {
  return typeIcons[type as NotificationType] ?? Bell
}

interface NotificationItemProps {
  notification: NotificationViewModel
  onClick: (notification: NotificationViewModel) => void
  compact?: boolean
  showPriority?: boolean
  trailing?: React.ReactNode
}

export function NotificationItem({
  notification: n,
  onClick,
  compact = false,
  showPriority = true,
  trailing,
}: NotificationItemProps) {
  const Icon = resolveIcon(n.type)
  const contextLine = formatNotificationContext(n)
  const showPriorityBadge =
    showPriority && (n.priority === 'critical' || n.priority === 'high')

  const rowClass = `w-full flex items-start gap-3 text-left transition-colors ${
    compact ? 'px-4 py-3 hover:bg-background-subtle' : 'p-4 rounded-xl border border-border hover:bg-background-subtle'
  } ${!n.isRead ? 'bg-primary-light/10' : compact ? '' : 'bg-surface'} ${
    !compact && !n.isRead ? 'border-primary/20' : ''
  } ${getPriorityAccentClass(n.priority)}`

  const content = (
    <>
      <div
        className={`flex items-center justify-center rounded-lg shrink-0 mt-0.5 ${
          compact ? 'w-8 h-8' : 'w-10 h-10 rounded-xl'
        } ${
          !n.isRead ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-muted'
        }`}
      >
        <Icon size={compact ? 16 : 20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-body truncate ${
              !n.isRead ? 'font-semibold text-text' : 'text-text-secondary'
            }`}
          >
            {n.title}
          </p>
          {showPriorityBadge && (
            <Badge variant={getPriorityBadgeVariant(n.priority)} size="sm">
              {getPriorityLabel(n.priority)}
            </Badge>
          )}
        </div>
        <p className={`text-caption text-text-muted ${compact ? 'truncate mt-0.5' : 'mt-0.5 line-clamp-2'}`}>
          {n.message}
        </p>
        {contextLine && (
          <p className="text-caption text-text-secondary truncate mt-1">{contextLine}</p>
        )}
        <div className={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
          <span className="text-caption text-text-muted">{formatNotificationTimeAgo(n.createdAt)}</span>
          {!compact && (
            <span className="text-caption font-medium text-text-muted bg-background-subtle px-2 py-0.5 rounded">
              {t.types[n.type as NotificationType] ?? n.type}
            </span>
          )}
        </div>
      </div>
      {!n.isRead && (
        <span
          className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2"
          aria-label={t.newLabel}
        />
      )}
    </>
  )

  if (trailing) {
    return (
      <div className={rowClass}>
        <button type="button" onClick={() => onClick(n)} className="flex flex-1 items-start gap-3 min-w-0 text-left">
          {content}
        </button>
        {trailing}
      </div>
    )
  }

  return (
    <button type="button" onClick={() => onClick(n)} className={rowClass}>
      {content}
    </button>
  )
}
