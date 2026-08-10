import { Eye, Ruler } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { gender as genderLabels } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import type { Child, NutritionStatus } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface ChildGrowthListCardProps {
  child: Child
  status?: NutritionStatus
  lastMeasurementDate?: string
  onRecord: () => void
  onView: () => void
  /** When true, hide the primary measure button (recent list). */
  viewOnly?: boolean
  className?: string
}

export function ChildGrowthListCard({
  child,
  status,
  lastMeasurementDate,
  onRecord,
  onView,
  viewOnly = false,
  className = '',
}: ChildGrowthListCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)

  return (
    <Card
      padding="lg"
      className={`h-full flex flex-col ${className}`}
      aria-label={child.fullName}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            flex items-center justify-center w-12 h-12 rounded-xl text-body font-bold shrink-0
            ${
              child.gender === 'Umuhungu'
                ? 'bg-secondary-light text-secondary'
                : 'bg-primary-light text-primary'
            }
          `}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-subheading text-text line-clamp-2 leading-snug min-h-11">
            {child.fullName}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 min-h-6">
            <span className="inline-flex items-center rounded-full bg-background-subtle px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
              {caretaker.children.age} {age}
            </span>
            <span className="text-caption text-text-muted truncate">
              {genderLabels[child.gender]}
            </span>
            {status && <GrowthStatusBadge status={status} />}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <div className="min-h-10 mb-3">
          <p className="text-caption font-semibold text-text-muted">
            {caretaker.growth.latestMeasurement}
          </p>
          <p className="text-caption text-text-secondary mt-0.5">
            {lastMeasurementDate
              ? formatDate(lastMeasurementDate)
              : caretaker.growth.dueNever}
          </p>
        </div>

        <div className={`grid gap-2 ${viewOnly ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!viewOnly && (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              icon={<Ruler size={16} />}
              onClick={onRecord}
              className="min-w-0"
              aria-label={`${caretaker.growth.recordMeasurement}: ${child.fullName}`}
            >
              <span className="truncate">{caretaker.growth.recordMeasurement}</span>
            </Button>
          )}
          <Button
            variant="tertiary"
            size="sm"
            fullWidth
            icon={<Eye size={16} />}
            onClick={onView}
            className="min-w-0"
            aria-label={`${viewOnly ? caretaker.growth.viewAll : caretaker.children.viewGrowth}: ${child.fullName}`}
          >
            <span className="truncate">
              {viewOnly ? caretaker.growth.viewAll : caretaker.children.viewGrowth}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
