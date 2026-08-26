import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { Button } from '@/components/ui/Button'
import { env } from '@/config/env'
import { useFollowUpAlerts } from '@/features/alerts'
import { formatFollowUpAlert, resolveFollowUpAlertPath } from '@/lib/follow-up-alerts'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { ActionAlertPriority } from '@/types'
import type { FollowUpAlertPriority, FollowUpAlertViewModel } from '@/models/alerts'

const priorityEmoji: Record<ActionAlertPriority, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
}

const priorityRank: Record<FollowUpAlertPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

interface AlertsPanelProps {
  compact?: boolean
  limit?: number
}

function isPanelAlert(alert: FollowUpAlertViewModel): boolean {
  return alert.priority === 'high' || alert.priority === 'medium'
}

export function AlertsPanel({ compact = false, limit = 4 }: AlertsPanelProps) {
  const query = useFollowUpAlerts({ limit: Math.max(limit * 4, 20) }, true)

  if (query.isError) {
    return (
      <LiveUnavailableState
        compact={compact}
        title={district.dashboard.priorityAlerts}
        description="Ntibyashoboye kubona amatangazo. Ongera ugerageze."
        className="h-full"
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => void query.refetch()}>
            {common.reset}
          </Button>
        }
      />
    )
  }

  if (query.isLoading) {
    return (
      <Card padding={compact ? 'md' : 'lg'} className="h-full">
        <Skeleton className="h-5 w-40 mb-3" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-12 w-full" />
      </Card>
    )
  }

  const alerts = [...(query.data?.items ?? [])]
    .filter(isPanelAlert)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, limit)

  if (alerts.length === 0) {
    return (
      <Card padding={compact ? 'md' : 'lg'} className="border-success/20 bg-success-light/20 h-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-body font-semibold text-success">{district.followup.empty}</p>
          <Link
            to="/district/gukurikirana"
            className="text-caption font-semibold text-primary hover:underline shrink-0"
          >
            {district.dashboard.viewFollowup}
          </Link>
        </div>
        <p className="text-caption text-text-secondary">{district.followup.emptyDesc}</p>
      </Card>
    )
  }

  return (
    <Card
      padding={compact ? 'md' : 'lg'}
      className="border-warning/25 bg-warning-light/10 h-full flex flex-col"
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-2.5' : 'mb-5'}`}>
        <h3
          className={`font-semibold text-text flex items-center gap-2 min-w-0 ${
            compact ? 'text-body' : 'text-subheading'
          }`}
        >
          <AlertTriangle size={compact ? 18 : 22} className="text-warning shrink-0" aria-hidden />
          <span className="truncate">{district.dashboard.priorityAlerts}</span>
        </h3>
        <Link
          to="/district/gukurikirana"
          className="text-caption font-semibold text-primary hover:underline shrink-0"
        >
          {district.dashboard.viewFollowup}
        </Link>
      </div>

      <ul className={`flex-1 ${compact ? 'space-y-1.5' : 'space-y-3'}`}>
        {alerts.map((alert) => {
          const copy = formatFollowUpAlert(alert)
          const href = resolveFollowUpAlertPath(alert, '/district')
          return (
            <li key={alert.id}>
              <Link
                to={href}
                className={`flex items-center gap-2 rounded-lg border border-warning/25 bg-surface hover:border-warning/50 transition-colors group ${
                  compact ? 'px-2.5 py-2' : 'p-4 items-start gap-3'
                }`}
              >
                <span className="text-base shrink-0" aria-hidden>
                  {priorityEmoji[alert.priority as ActionAlertPriority] ?? priorityEmoji.medium}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-text truncate ${
                      compact ? 'text-caption' : 'text-body'
                    }`}
                  >
                    {copy.heading}
                  </p>
                  <p
                    className={`text-warning truncate ${
                      compact ? 'text-caption mt-0.5' : 'text-body mt-1'
                    }`}
                  >
                    {copy.detail}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-text-muted shrink-0 opacity-60 group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
      {!env.isLive ? (
        <p className="text-caption text-text-muted mt-3">{common.excelExport.mockDataNote}</p>
      ) : null}
    </Card>
  )
}
