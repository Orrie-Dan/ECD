import { Baby, Check, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { calculateAge } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import type { Child } from '@/types'

interface AttendanceCardProps {
  child: Child
  onMarkArrived: () => void
}

export function AttendanceCard({ child, onMarkArrived }: AttendanceCardProps) {
  const age = calculateAge(child.dateOfBirth)

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-card hover:border-primary/25 transition-all duration-200">
      <div className="flex items-start gap-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-light text-primary shrink-0" aria-hidden="true">
          <Baby size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-subheading text-text">{child.fullName}</h3>
          <p className="text-body text-text-secondary mt-1">
            {caretaker.children.age}: {age}
          </p>
          <p className="inline-flex items-center gap-1.5 mt-2 text-body font-medium text-warning">
            <Hourglass size={18} aria-hidden="true" />
            {caretaker.attendance.notYetArrived}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Check size={22} strokeWidth={2.5} />}
          onClick={onMarkArrived}
        >
          {caretaker.attendance.markArrived}
        </Button>
      </div>
    </article>
  )
}
