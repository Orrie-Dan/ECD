import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import type { NotificationViewModel } from '@/models/notifications'

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

interface NotificationInboxPanelProps {
  open: boolean
  onClose: () => void
  unreadCount: number
  items: NotificationViewModel[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onItemClick: (notification: NotificationViewModel) => void
  onMarkAllRead: () => void
  markAllPending: boolean
  onViewAll: () => void
  anchorClassName?: string
}

export function NotificationInboxPanel({
  open,
  onClose,
  unreadCount,
  items,
  isLoading,
  isError,
  onRetry,
  onItemClick,
  onMarkAllRead,
  markAllPending,
  onViewAll,
  anchorClassName = 'absolute right-0 top-full mt-2',
}: NotificationInboxPanelProps) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open || !isMobile) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, isMobile, onClose])

  if (!open) return null

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <h3 className="text-body font-bold text-text">{t.title}</h3>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={markAllPending}
          className="flex items-center gap-1.5 text-caption font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
        >
          <Check size={14} />
          {t.markAllRead}
        </button>
      )}
    </div>
  )

  const body = (
    <div className={`overflow-y-auto divide-y divide-border ${isMobile ? 'flex-1 min-h-0' : 'max-h-[24rem]'}`}>
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="px-4 py-8 text-center">
          <p className="text-body text-text-secondary">{t.loadError}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            {t.retry}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Bell size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-body text-text-secondary">{t.empty}</p>
          <p className="text-caption text-text-muted mt-1">{t.emptyDesc}</p>
        </div>
      ) : (
        items.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onClick={onItemClick}
            compact
          />
        ))
      )}
    </div>
  )

  const footer = (
    <div className="border-t border-border px-4 py-2.5 shrink-0">
      <button
        type="button"
        onClick={onViewAll}
        className="w-full text-center text-caption font-semibold text-primary hover:text-primary-dark transition-colors"
      >
        {t.viewAll}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-text/40"
          onClick={onClose}
          aria-label={t.title}
        />
        <div
          className="relative w-full max-h-[min(85dvh,100%)] bg-surface rounded-t-2xl border border-border shadow-lg flex flex-col overflow-hidden safe-area-bottom"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          {header}
          {body}
          {footer}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${anchorClassName} w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-surface rounded-xl border border-border shadow-lg z-50 overflow-hidden`}
      role="dialog"
      aria-label={t.title}
    >
      {header}
      {body}
      {footer}
    </div>
  )
}
