import { useState } from 'react'
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
  CheckCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications'
import { useData } from '@/contexts/AppContext'
import { getNotificationLink } from '@/lib/notification-links'
import { formatNotification } from '@/lib/format-notification'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import { common } from '@/locales/rw/common'
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

interface NotificationsPageContentProps {
  rolePrefix: string
}

export function NotificationsPageContent({ rolePrefix }: NotificationsPageContentProps) {
  const navigate = useNavigate()
  const { children } = useData()
  const [page, setPage] = useState(1)
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined)
  const pageSize = 20

  const { data, isLoading, isError, refetch } = useNotifications(
    { page, pageSize, isRead: filterRead },
    env.isLive,
  )
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  function handleClick(n: NotificationViewModel) {
    if (!n.isRead) markRead.mutate(n.id)
    navigate(getNotificationLink(n.entityType, n.entityId, rolePrefix, n.type))
  }

  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader title={t.title} />
        <PageContent>
          <LiveUnavailableState title={t.title} description={t.emptyDesc} />
        </PageContent>
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageHeader title={t.title} />
        <PageContent>
          <LiveUnavailableState
            title={t.title}
            description={common.live.unavailableDesc}
            action={
              <Button variant="primary" size="sm" onClick={() => void refetch()}>
                {common.reset}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        action={
          (data?.unreadCount ?? 0) > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck size={16} />}
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {t.markAllRead}
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        <div className="flex gap-2 mb-4">
          {([
            [undefined, t.title] as const,
            [false, t.unread] as const,
          ]).map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => { setFilterRead(value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-colors ${
                filterRead === value
                  ? 'bg-primary !text-white shadow-sm [&_*]:!text-white'
                  : 'bg-background-subtle text-text-secondary hover:bg-background'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <Card padding="lg" className="text-center py-12">
            <Bell size={32} className="mx-auto text-text-muted mb-3" />
            <p className="text-body font-semibold text-text-secondary">{t.empty}</p>
            <p className="text-caption text-text-muted mt-1">{t.emptyDesc}</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {data!.items.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell
                const copy = formatNotification(n, children)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-colors text-left ${
                      !n.isRead
                        ? 'border-primary/20 bg-primary-light/5 hover:border-primary/40'
                        : 'border-border bg-surface hover:bg-background-subtle'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                        !n.isRead ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-muted'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-body truncate ${!n.isRead ? 'font-semibold text-text' : 'text-text-secondary'}`}>
                          {copy.title}
                        </p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-caption text-text-muted mt-0.5 line-clamp-2">{copy.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-caption text-text-muted">{timeAgo(n.createdAt)}</span>
                        <span className="text-caption font-medium text-text-muted bg-background-subtle px-2 py-0.5 rounded">
                          {t.types[n.type] ?? n.type}
                        </span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          markRead.mutate(n.id)
                        }}
                        className="shrink-0 p-1.5 rounded-lg text-text-muted hover:bg-background-subtle hover:text-primary transition-colors"
                        aria-label={t.markRead}
                        title={t.markRead}
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </button>
                )
              })}
            </div>

            {data && data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {common.pagination.previous}
                </Button>
                <span className="text-caption text-text-muted">
                  {common.pagination.page} {data.page} {common.pagination.of} {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {common.pagination.next}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageContainer>
  )
}
