import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Ruler } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { district } from '@/locales/rw/district'
import { formatDate } from '@/lib/mock-data'
import { buildChildDetailPath } from '@/lib/child-routes'
import type { NutritionAlert, NutritionAlertKind } from '@/lib/nutrition-utils'

interface NutritionAlertListProps {
  alerts: NutritionAlert[]
}

const KIND_LABEL: Record<NutritionAlertKind, string> = {
  severe: district.growth.alertSevere,
  moderate: district.growth.alertModerate,
  at_risk: district.growth.alertAtRisk,
  overdue: district.growth.alertOverdue,
  due: district.growth.alertDue,
}

const KIND_REC: Record<NutritionAlertKind, string> = {
  severe: district.growth.alertRecSevere,
  moderate: district.growth.alertRecModerate,
  at_risk: district.growth.alertRecAtRisk,
  overdue: district.growth.alertRecOverdue,
  due: district.growth.alertRecDue,
}

const KIND_VARIANT: Record<NutritionAlertKind, 'danger' | 'warning' | 'info'> = {
  severe: 'danger',
  moderate: 'warning',
  at_risk: 'warning',
  overdue: 'danger',
  due: 'info',
}

const KIND_BORDER: Record<NutritionAlertKind, string> = {
  severe: 'border-l-error',
  moderate: 'border-l-warning',
  at_risk: 'border-l-warning',
  overdue: 'border-l-error',
  due: 'border-l-secondary',
}

const KIND_ICON_BG: Record<NutritionAlertKind, string> = {
  severe: 'bg-error-light text-error',
  moderate: 'bg-warning-light text-warning',
  at_risk: 'bg-warning-light text-warning',
  overdue: 'bg-error-light text-error',
  due: 'bg-secondary-light text-secondary',
}

function AlertIcon({ kind }: { kind: NutritionAlertKind }) {
  if (kind === 'due' || kind === 'overdue') return <Clock size={18} aria-hidden />
  if (kind === 'severe' || kind === 'moderate' || kind === 'at_risk') {
    return <AlertTriangle size={18} aria-hidden />
  }
  return <Ruler size={18} aria-hidden />
}

export function NutritionAlertList({ alerts }: NutritionAlertListProps) {
  return (
    <section className="space-y-3" aria-labelledby="nutrition-alerts-heading">
      <h2 id="nutrition-alerts-heading" className="text-subheading text-text">
        {district.growth.alertsTitle}
      </h2>

      {alerts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={district.growth.alertsEmpty}
          description={district.growth.alertsEmptyDesc}
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none m-0 p-0">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Card
                padding="md"
                className={`h-full border-l-4 ${KIND_BORDER[alert.kind]} flex flex-col`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${KIND_ICON_BG[alert.kind]}`}
                  >
                    <AlertIcon kind={alert.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-body font-semibold text-text truncate">{alert.childName}</p>
                      {alert.nutritionStatus ? (
                        <GrowthStatusBadge status={alert.nutritionStatus} size="sm" />
                      ) : (
                        <Badge variant={KIND_VARIANT[alert.kind]} size="sm">
                          {KIND_LABEL[alert.kind]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-caption text-text-secondary">{alert.centerName}</p>
                    <p className="text-caption text-text-muted mt-1">
                      {district.growth.lastScreening}:{' '}
                      {alert.lastScreeningDate
                        ? formatDate(alert.lastScreeningDate)
                        : district.growth.notAssessed}
                    </p>
                  </div>
                </div>

                <p className="text-body text-text mt-3">{KIND_REC[alert.kind]}</p>

                <div className="mt-auto pt-3 border-t border-border">
                  <Link
                    to={buildChildDetailPath('/district/abana', {
                      id: alert.childId,
                      fullName: alert.childName,
                    })}
                    className="inline-flex items-center text-caption font-semibold text-primary hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {district.growth.viewChild}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
