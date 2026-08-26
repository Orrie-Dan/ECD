import { useNavigate } from 'react-router-dom'
import { Pencil, Ruler, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { caretaker } from '@/locales/rw/caretaker'
import { buildChildDetailPath } from '@/lib/child-routes'
import { gender as genderLabels } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import type { Child, GrowthMeasurement, NutritionStatus } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface GrowthRosterCardProps {
  child: Child
  /** Measurement for the selected session month */
  monthMeasurement?: GrowthMeasurement
  lastMeasurement?: GrowthMeasurement
  nutritionStatus?: NutritionStatus
  onRecord: () => void
}

export function GrowthRosterCard({
  child,
  monthMeasurement,
  lastMeasurement,
  nutritionStatus,
  onRecord,
}: GrowthRosterCardProps) {
  const navigate = useNavigate()
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)
  const complete = !!monthMeasurement
  const lastDate = lastMeasurement?.date ?? monthMeasurement?.date

  return (
    <Card
      padding="lg"
      className={`sm:hidden h-full flex flex-col border-l-4 ${
        complete ? 'border-l-success' : 'border-l-warning'
      }`}
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
          <h3 className="text-subheading text-text truncate">{child.fullName}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-background-subtle px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
              {caretaker.children.age} {age}
            </span>
            <span className="text-caption text-text-muted truncate">
              {genderLabels[child.gender]}
            </span>
            <Badge variant={complete ? 'success' : 'warning'} size="sm">
              {complete ? caretaker.growth.monthComplete : caretaker.growth.monthIncomplete}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-caption mt-4">
        <div>
          <dt className="text-text-muted uppercase tracking-wide font-semibold">
            {caretaker.growth.lastMeasurement}
          </dt>
          <dd className="font-medium text-text mt-0.5">
            {lastDate ? formatDate(lastDate) : caretaker.growth.dueNever}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted uppercase tracking-wide font-semibold">
            {caretaker.growth.nutritionStatus}
          </dt>
          <dd className="mt-0.5">
            {nutritionStatus ? (
              <GrowthStatusBadge status={nutritionStatus} />
            ) : (
              <span className="text-text-secondary">—</span>
            )}
          </dd>
        </div>
        {monthMeasurement && (
          <>
            <div>
              <dt className="text-text-muted uppercase tracking-wide font-semibold">
                {caretaker.growth.weightShort}
              </dt>
              <dd className="font-semibold text-text mt-0.5 tabular-nums">
                {monthMeasurement.weightKg} kg
              </dd>
            </div>
            <div>
              <dt className="text-text-muted uppercase tracking-wide font-semibold">
                {caretaker.growth.heightShort}
              </dt>
              <dd className="font-semibold text-text mt-0.5 tabular-nums">
                {monthMeasurement.heightCm > 0 ? `${monthMeasurement.heightCm} cm` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted uppercase tracking-wide font-semibold">
                {caretaker.growth.muacShort}
              </dt>
              <dd className="font-semibold text-text mt-0.5 tabular-nums">
                {monthMeasurement.muacCm} cm
              </dd>
            </div>
          </>
        )}
      </dl>

      <div className="mt-auto pt-3 border-t border-border grid grid-cols-1 gap-2">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={complete ? <Pencil size={16} /> : <Ruler size={16} />}
          onClick={onRecord}
          aria-label={`${complete ? caretaker.growth.editMeasurement : caretaker.growth.markMeasured}: ${child.fullName}`}
        >
          {complete ? caretaker.growth.editMeasurement : caretaker.growth.markMeasured}
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          fullWidth
          icon={<Eye size={16} />}
          onClick={() => navigate(buildChildDetailPath('/caretaker/abana', child, 'growth'))}
          aria-label={`${caretaker.growth.viewHistory}: ${child.fullName}`}
        >
          {caretaker.growth.viewHistory}
        </Button>
      </div>
    </Card>
  )
}
