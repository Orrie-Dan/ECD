import { Baby, Phone, User, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { calculateAge } from '@/lib/mock-data'
import { gender as genderLabels } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import type { Child } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface ChildCardProps {
  child: Child
  onView?: () => void
  onViewAttendance?: () => void
  onSelect?: () => void
  selected?: boolean
  showActions?: boolean
}

export function ChildCard({
  child,
  onView,
  onViewAttendance,
  onSelect,
  selected,
  showActions = true,
}: ChildCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)

  const content = (
    <>
      <div className="flex items-start gap-4">
        <div
          className={`
            flex items-center justify-center w-14 h-14 rounded-xl text-lg font-bold shrink-0
            ${child.gender === 'Umuhungu' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'}
          `}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-subheading text-text truncate">{child.fullName}</h3>
          <p className="text-caption mt-0.5">
            {caretaker.children.age}: <span className="font-semibold text-text">{age}</span>
            <span className="mx-2 text-border-strong">·</span>
            {genderLabels[child.gender]}
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-body text-text-secondary">
              <User size={16} className="text-text-muted shrink-0" />
              <span className="truncate">{child.guardianName}</span>
            </div>
            <div className="flex items-center gap-2 text-body text-text-secondary">
              <Phone size={16} className="text-text-muted shrink-0" />
              <span>{child.guardianPhone}</span>
            </div>
          </div>
        </div>
        {!onSelect && (
          <Baby size={20} className="text-text-muted opacity-40 shrink-0 hidden sm:block" aria-hidden="true" />
        )}
      </div>
      {showActions && (onView || onViewAttendance) && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border">
          {onView && (
            <Button variant="secondary" size="sm" icon={<Eye size={16} />} onClick={onView}>
              {caretaker.children.viewDetails}
            </Button>
          )}
          {onViewAttendance && (
            <Button variant="tertiary" size="sm" icon={<Eye size={16} />} onClick={onViewAttendance}>
              {caretaker.children.viewAttendance}
            </Button>
          )}
        </div>
      )}
    </>
  )

  if (onSelect) {
    return (
      <button
        onClick={onSelect}
        className={`
          w-full text-left rounded-xl border p-5 sm:p-6 transition-all duration-150 shadow-card
          ${selected
            ? 'border-primary bg-primary-light/50 shadow-md ring-2 ring-primary/20'
            : 'border-border bg-surface hover:border-primary/30 hover:shadow-md'}
        `}
      >
        {content}
      </button>
    )
  }

  return <Card>{content}</Card>
}
