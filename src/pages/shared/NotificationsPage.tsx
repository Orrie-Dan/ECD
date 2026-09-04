import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { env } from '@/config/env'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications'
import { getNotificationActionPath } from '@/lib/notification-utils'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import { common } from '@/locales/rw/common'
import type { NotificationViewModel } from '@/models/notifications'

interface NotificationsPageContentProps {
  /** @deprecated Backend action paths are role-aware; prop retained for layout wrappers. */
  rolePrefix?: string
}

export function NotificationsPageContent({ rolePrefix }: NotificationsPageContentProps = {}) {
  const navigate = useNavigate()
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
    const path = getNotificationActionPath(n, rolePrefix)
    if (path) navigate(path)
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
            description={t.loadError}
            action={
              <Button variant="primary" size="sm" onClick={() => void refetch()}>
                {t.retry}
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
            [undefined, t.filterAll] as const,
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
              {data!.items.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={handleClick}
                  trailing={
                    !n.isRead ? (
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
                    ) : undefined
                  }
                />
              ))}
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
