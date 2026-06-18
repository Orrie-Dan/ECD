import { Check, Clock, Hourglass, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { calculateAge } from '@/lib/mock-data'
import { gender as genderLabels, relations } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import { formatArrivalTime, getBroughtByLabel } from '@/lib/attendance-utils'
import type { AttendanceRecord, Child } from '@/types'

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

interface AttendanceChecklistCardProps {
  child: Child
  record?: AttendanceRecord
  onMarkArrived: () => void
  onEdit: () => void
}

export function AttendanceChecklistCard({
  child,
  record,
  onMarkArrived,
  onEdit,
}: AttendanceChecklistCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)
  const isPresent = !!record?.present

  return (
    <article
      className={`
        rounded-xl border p-5 transition-all duration-150 shadow-card
        ${isPresent
          ? 'border-success/25 bg-success-light/20'
          : 'border-border bg-surface hover:border-primary/25'}
      `}
    >
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
            {caretaker.children.age} {age} · {genderLabels[child.gender]}
          </p>

          {isPresent ? (
            <div className="mt-3 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 text-body font-semibold text-success">
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                {caretaker.attendance.hasArrived}
              </p>
              {record?.broughtBy && (
                <p className="text-body text-text-secondary">
                  <span className="text-text-muted">{caretaker.attendance.broughtByLabel}:</span>{' '}
                  {getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)}
                </p>
              )}
              {record?.arrivedAt && (
                <p className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
                  <Clock size={14} aria-hidden="true" />
                  {caretaker.attendance.arrivalTime}: {formatArrivalTime(record.arrivedAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 mt-3 text-body font-medium text-warning">
              <Hourglass size={18} aria-hidden="true" />
              {caretaker.attendance.notYetArrived}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/60">
        {isPresent ? (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Pencil size={20} />}
            onClick={onEdit}
          >
            {caretaker.attendance.edit}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Check size={22} strokeWidth={2.5} />}
            onClick={onMarkArrived}
          >
            {caretaker.attendance.markArrived}
          </Button>
        )}
      </div>
    </article>
  )
}
