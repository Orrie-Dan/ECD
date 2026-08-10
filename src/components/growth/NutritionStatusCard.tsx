import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import type { GrowthMeasurement, NutritionAssessment, NutritionStatus } from '@/types'

interface NutritionStatusCardProps {
  measurement?: GrowthMeasurement
  assessment?: NutritionAssessment
  className?: string
}

const STATUS_BORDER: Record<NutritionStatus, string> = {
  normal: 'border-l-success',
  at_risk: 'border-l-warning',
  moderate: 'border-l-warning',
  severe: 'border-l-error',
}

const STATUS_BG: Record<NutritionStatus, string> = {
  normal: 'bg-success-light/20',
  at_risk: 'bg-warning-light/25',
  moderate: 'bg-warning-light/25',
  severe: 'bg-error-light/25',
}

export function NutritionStatusCard({
  measurement,
  assessment,
  className = '',
}: NutritionStatusCardProps) {
  const status = assessment?.status
  const borderClass = status ? STATUS_BORDER[status] : 'border-l-border'
  const bgClass = status ? STATUS_BG[status] : ''

  return (
    <Card
      padding="lg"
      className={`border-l-4 ${borderClass} ${bgClass} ${className}`}
    >
      <h3 className="text-label text-primary mb-4">{caretaker.growth.nutritionStatus}</h3>
      {!measurement || !assessment ? (
        <p className="text-body text-text-secondary">{caretaker.growth.noMeasurements}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <GrowthStatusBadge status={assessment.status} size="md" />
            {assessment.requiresReferral && (
              <Badge variant="danger" className="gap-1.5">
                <AlertTriangle size={14} aria-hidden />
                {caretaker.growth.requiresReferral}
              </Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                {caretaker.growth.measurementDate}
              </dt>
              <dd className="text-body font-semibold text-text mt-0.5">
                {formatDate(measurement.date)}
              </dd>
            </div>
            <div>
              <dt className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                {caretaker.growth.weightShort}
              </dt>
              <dd className="text-body font-semibold text-text mt-0.5 tabular-nums">
                {measurement.weightKg} kg
              </dd>
            </div>
            <div>
              <dt className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                {caretaker.growth.muacShort}
              </dt>
              <dd className="text-body font-semibold text-text mt-0.5 tabular-nums">
                {measurement.muacCm} cm
              </dd>
            </div>
          </dl>
          {measurement.notes && (
            <p className="text-body text-text-secondary border-t border-border pt-3">
              {measurement.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
