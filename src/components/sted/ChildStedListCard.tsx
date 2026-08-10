import { Accessibility, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { gender as genderLabels } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import type { Child, StedAgeBand } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface ChildStedListCardProps {
  child: Child
  ageBand?: StedAgeBand
  lastAssessmentDate?: string
  followUpDueDate?: string
  referred?: boolean
  outcomeNormal?: boolean
  onAssess: () => void
  onView: () => void
  /** Recent list: hide assess CTA. */
  viewOnly?: boolean
  className?: string
}

export function ChildStedListCard({
  child,
  ageBand,
  lastAssessmentDate,
  followUpDueDate,
  referred = false,
  outcomeNormal = false,
  onAssess,
  onView,
  viewOnly = false,
  className = '',
}: ChildStedListCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)
  const ageBandLabel =
    ageBand === '1_3'
      ? caretaker.sted.ageBand1_3
      : ageBand === '4_6'
        ? caretaker.sted.ageBand4_6
        : null

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
            {ageBandLabel && (
              <Badge variant="neutral" size="sm">
                {ageBandLabel}
              </Badge>
            )}
            {referred && (
              <Badge variant="warning" size="sm">
                {caretaker.sted.outcomeReferred}
              </Badge>
            )}
            {!referred && outcomeNormal && (
              <Badge variant="success" size="sm">
                {caretaker.sted.outcomeNormal}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <div className="min-h-10 mb-3 space-y-1">
          <div>
            <p className="text-caption font-semibold text-text-muted">
              {caretaker.sted.lastAssessment}
            </p>
            <p className="text-caption text-text-secondary mt-0.5">
              {lastAssessmentDate
                ? formatDate(lastAssessmentDate)
                : caretaker.sted.neverAssessed}
            </p>
          </div>
          {followUpDueDate && (
            <p className="text-caption text-warning font-semibold">
              {caretaker.sted.nextFollowUp}: {formatDate(followUpDueDate)}
            </p>
          )}
        </div>

        <div className={`grid gap-2 ${viewOnly ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!viewOnly && (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              icon={<Accessibility size={16} />}
              onClick={onAssess}
              className="min-w-0"
              aria-label={`${caretaker.sted.startAssessment}: ${child.fullName}`}
            >
              <span className="truncate">{caretaker.sted.startAssessment}</span>
            </Button>
          )}
          <Button
            variant="tertiary"
            size="sm"
            fullWidth
            icon={<Eye size={16} />}
            onClick={onView}
            className="min-w-0"
            aria-label={`${caretaker.sted.viewAssessment}: ${child.fullName}`}
          >
            <span className="truncate">{caretaker.sted.viewAssessment}</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
