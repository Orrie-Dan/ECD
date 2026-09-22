import { Briefcase, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useCaregiverWorkExperiences } from '@/features/caregiver-work-experiences/queries'
import { caretaker } from '@/locales/rw/caretaker'
import type { CaregiverWorkExperienceViewModel } from '@/models/caregiver-work-experiences'

const copy = caretaker.users.workExperience

function formatRange(start: string, end: string | null): string {
  if (!end) return `${start} — ${copy.currentRole}`
  return `${start} — ${end}`
}

export interface CaregiverWorkExperienceHistoryListProps {
  userId: string
  enabled?: boolean
  onSelect?: (record: CaregiverWorkExperienceViewModel) => void
}

export function CaregiverWorkExperienceHistoryList({
  userId,
  enabled = true,
  onSelect,
}: CaregiverWorkExperienceHistoryListProps) {
  const list = useCaregiverWorkExperiences(userId, enabled)
  const items = list.data ?? []

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} height="5rem" rounded="lg" className="w-full" />
        ))}
      </div>
    )
  }

  if (list.isError) {
    return (
      <LiveUnavailableState
        title={copy.listError}
        action={
          <Button variant="secondary" size="sm" onClick={() => void list.refetch()}>
            {copy.retry}
          </Button>
        }
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState title={copy.empty} />
  }

  return (
    <div className="space-y-3">
      {items.map((row) => (
        <Card
          key={row.id}
          elevated
          padding="md"
          className={onSelect ? 'border border-border hover:border-primary/30 transition-colors' : ''}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-subheading text-text">{row.jobTitle}</h4>
                {!row.endDate ? (
                  <Badge variant="success">{copy.currentRole}</Badge>
                ) : null}
              </div>
              <p className="text-body text-text-secondary flex items-center gap-1.5">
                <Briefcase size={14} aria-hidden="true" />
                {row.employer}
              </p>
              <p className="text-caption text-text-muted flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" />
                {formatRange(row.startDate, row.endDate)}
              </p>
              {row.description ? (
                <p className="text-caption text-text-secondary whitespace-pre-wrap">{row.description}</p>
              ) : null}
            </div>
            {onSelect ? (
              <Button variant="ghost" size="sm" onClick={() => onSelect(row)}>
                {copy.view}
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  )
}
