import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { Button } from '@/components/ui/Button'
import { env } from '@/config/env'
import { useFollowUpAlerts } from '@/features/alerts'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import { common } from '@/locales/rw/common'
import {
  formatFollowUpAlert,
  resolveFollowUpAlertPath,
  summarizeActionableFollowUpAlerts,
} from '@/lib/follow-up-alerts'
import type { FollowUpAlertPriority } from '@/models/alerts'

const ALERTS_PATH = '/caretaker/impugukirwa'
const ROLE_PREFIX = '/caretaker'

const priorityDot: Record<FollowUpAlertPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

interface AlertsPanelProps {
  centerId?: string
  limit?: number
}

export function AlertsPanel({ centerId, limit = 4 }: AlertsPanelProps) {
  const { children } = useData()
  const live = useFollowUpAlerts(
    { centerId, limit: Math.max(limit * 5, 20) },
    Boolean(centerId) || !env.isLive,
  )

  if (env.isLive && !centerId) {
    return (
      <Card padding="lg" className="border-border bg-background-subtle/40">
        <p className="text-body font-semibold text-text">{caretaker.dashboard.priorityAlerts}</p>
        <p className="text-caption text-text-secondary mt-1">{t.alerts.emptyDesc}</p>
      </Card>
    )
  }

  if (live.isError) {
    return (
      <LiveUnavailableState
        title={caretaker.dashboard.priorityAlerts}
        description={common.live.unavailableDesc}
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => void live.refetch()}>
            {common.reset}
          </Button>
        }
      />
    )
  }

  if (live.isLoading) {
    return (
      <Card padding="lg">
        <Skeleton className="h-5 w-44 mb-3" />
        <Skeleton className="h-14 w-full mb-2" />
        <Skeleton className="h-14 w-full" />
      </Card>
    )
  }

  const summary = summarizeActionableFollowUpAlerts(live.data?.items ?? [], children)
  const alerts = [...summary.items]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, limit)

  if (alerts.length === 0) {
    return (
      <Card padding="lg" className="border-success/20 bg-success-light/20">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-body font-semibold text-success">{t.alerts.empty}</p>
          <Link
            to={ALERTS_PATH}
            className="text-caption font-semibold text-primary hover:underline shrink-0"
          >
            {caretaker.dashboard.viewAlerts}
          </Link>
        </div>
        <p className="text-caption text-text-secondary">{t.alerts.emptyDesc}</p>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="border-warning/25 bg-warning-light/10">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-subheading text-text flex items-center gap-2 min-w-0">
          <AlertTriangle size={20} className="text-warning shrink-0" aria-hidden />
          <span className="truncate">{caretaker.dashboard.priorityAlerts}</span>
          {summary.counts.high > 0 ? (
            <span className="text-caption font-bold text-error shrink-0">
              {summary.counts.high}
            </span>
          ) : null}
        </h2>
        <Link
          to={ALERTS_PATH}
          className="text-caption font-semibold text-primary hover:underline shrink-0"
        >
          {caretaker.dashboard.viewAlerts}
        </Link>
      </div>

      <ul className="space-y-2">
        {alerts.map((alert) => {
          const copy = formatFollowUpAlert(alert, children)
          const href = resolveFollowUpAlertPath(alert, ROLE_PREFIX, children)
          return (
            <li key={alert.id}>
              <Link
                to={href}
                className="flex items-start gap-3 p-3 rounded-lg border border-warning/25 bg-surface hover:border-warning/50 transition-colors group"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${priorityDot[alert.priority]}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-text truncate">{copy.heading}</p>
                  <p className="text-caption text-warning mt-0.5 line-clamp-2">{copy.detail}</p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-text-muted shrink-0 mt-1 opacity-60 group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
