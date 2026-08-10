import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import {
  getAssessmentDueStatus,
  getNextAssessmentDate,
} from '@/lib/nutrition-utils'
import type { AssessmentDueStatus } from '@/types'

const DUE_LABELS: Record<AssessmentDueStatus, string> = {
  up_to_date: caretaker.growth.dueUpToDate,
  due: caretaker.growth.dueSoon,
  overdue: caretaker.growth.dueOverdue,
  never: caretaker.growth.dueNever,
}

const DUE_VARIANT: Record<AssessmentDueStatus, 'success' | 'warning' | 'danger'> = {
  up_to_date: 'success',
  due: 'warning',
  overdue: 'danger',
  never: 'warning',
}

interface AssessmentReminderCardProps {
  latestDate?: string
  className?: string
}

export function AssessmentReminderCard({
  latestDate,
  className = '',
}: AssessmentReminderCardProps) {
  const dueStatus = getAssessmentDueStatus(latestDate)
  const nextDate = getNextAssessmentDate(latestDate)

  const accentBorder =
    dueStatus === 'overdue' || dueStatus === 'never'
      ? 'border-l-error'
      : dueStatus === 'due'
        ? 'border-l-warning'
        : 'border-l-success'

  const iconBg =
    dueStatus === 'overdue' || dueStatus === 'never'
      ? 'bg-error-light text-error'
      : dueStatus === 'due'
        ? 'bg-warning-light text-warning'
        : 'bg-success-light text-success'

  return (
    <Card padding="lg" className={`border-l-4 ${accentBorder} ${className}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBg}`}
        >
          <Clock size={20} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-label text-primary mb-1">{caretaker.growth.reminderTitle}</h3>
          <p className="text-caption text-text-secondary mb-3">
            {caretaker.growth.nextAssessmentHint}
          </p>
          <Badge variant={DUE_VARIANT[dueStatus]} size="md">
            {DUE_LABELS[dueStatus]}
          </Badge>
          {nextDate && dueStatus === 'up_to_date' && (
            <p className="text-body text-text-secondary mt-3">
              {caretaker.growth.nextAssessment}:{' '}
              <span className="font-semibold text-text">{formatDate(nextDate)}</span>
            </p>
          )}
          {latestDate && (
            <p className="text-caption text-text-muted mt-2">
              {caretaker.growth.latestMeasurement}: {formatDate(latestDate)}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
