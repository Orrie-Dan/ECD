import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { filterActionAlerts } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'
import type { ActionAlert, ActionAlertCategory, ActionAlertPriority } from '@/types'

const priorityStyles: Record<ActionAlertPriority, { emoji: string; badge: string }> = {
  high: { emoji: '🔴', badge: 'bg-error-light text-error border-error/30' },
  medium: { emoji: '🟡', badge: 'bg-warning-light text-warning border-warning/30' },
  low: { emoji: '🟢', badge: 'bg-success-light text-success border-success/30' },
}

const priorityLabels: Record<ActionAlertPriority, string> = {
  high: district.followup.priorityHigh,
  medium: district.followup.priorityMedium,
  low: district.followup.priorityLow,
}

const categoryLabels: Record<ActionAlertCategory, string> = {
  attendance: district.followup.filterAttendance,
  enrollment: district.followup.filterEnrollment,
  data_quality: district.followup.filterDataQuality,
  operational: district.followup.filterOperational,
}

function ActionAlertCard({ alert }: { alert: ActionAlert }) {
  const style = priorityStyles[alert.priority]

  return (
    <Link
      to={`/district/ibigo/${alert.centerId}`}
      className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0" aria-hidden>
              {style.emoji}
            </span>
            <h3 className="text-body font-bold text-text truncate">{alert.centerName}</h3>
          </div>
          <span
            className={`text-caption font-semibold px-2.5 py-1 rounded-full border shrink-0 ${style.badge}`}
          >
            {priorityLabels[alert.priority]}
          </span>
        </div>

        <p className="text-caption text-text-secondary mb-3">
          {district.followup.sector}: {alert.sector} · {categoryLabels[alert.category]}
        </p>

        <p className="text-body text-text mb-4">{alert.description}</p>

        {alert.metrics && alert.metrics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {alert.metrics.map((metric) => (
              <span
                key={metric.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-subtle text-caption"
              >
                <span className="text-text-secondary">{metric.label}:</span>
                <span className="font-bold text-text">{metric.value}</span>
              </span>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary-light/30 px-4 py-3">
          <p className="text-caption font-semibold text-primary mb-1">
            {district.followup.suggestedAction}
          </p>
          <p className="text-body text-text">{alert.suggestedAction}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background-subtle/50 rounded-b-xl">
        <span className="text-caption font-semibold text-primary">{district.followup.viewCenter}</span>
        <ChevronRight
          size={16}
          className="text-primary opacity-60 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  )
}

interface ActionAlertsListProps {
  category: string
}

export function ActionAlertsList({ category }: ActionAlertsListProps) {
  const alerts = filterActionAlerts(category)

  if (alerts.length === 0) {
    return (
      <Card padding="lg" className="border-success/20 bg-success-light/20">
        <p className="text-body font-semibold text-success">{district.followup.empty}</p>
        <p className="text-caption text-text-secondary mt-1">{district.followup.emptyDesc}</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {alerts.map((alert) => (
        <ActionAlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
