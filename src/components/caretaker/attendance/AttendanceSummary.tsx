import { Calendar, Check, Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'

interface AttendanceSummaryProps {
  total: number
  arrived: number
  waiting: number
}

export function AttendanceSummary({ total, arrived, waiting }: AttendanceSummaryProps) {
  const rate = total > 0 ? Math.round((arrived / total) * 100) : 0

  return (
    <Card padding="lg" className="mb-6 border-primary/15 bg-gradient-to-br from-primary-light/60 to-surface">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Calendar size={22} className="text-primary" />
        </span>
        <h2 className="text-subheading text-text">{caretaker.attendance.summaryTitle}</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-3 rounded-xl bg-surface/80 border border-border">
          <p className="text-display text-text leading-none">{total}</p>
          <p className="text-caption mt-1.5">{caretaker.attendance.totalChildren}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-success-light/60 border border-success/20">
          <p className="text-display text-success leading-none inline-flex items-center justify-center gap-2">
            <Check size={22} aria-hidden="true" />
            {arrived}
          </p>
          <p className="text-caption text-success mt-1.5">{caretaker.attendance.arrived}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-warning-light/50 border border-warning/20">
          <p className="text-display text-warning leading-none inline-flex items-center justify-center gap-2">
            <Hourglass size={22} aria-hidden="true" />
            {waiting}
          </p>
          <p className="text-caption text-warning mt-1.5">{caretaker.attendance.waiting}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-caption font-medium text-text-secondary">{rate}%</span>
          <span className="text-caption text-text-muted">
            {arrived} / {total}
          </span>
        </div>
        <div className="h-3 bg-background-subtle rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${rate}%` }}
            role="progressbar"
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${rate}% byageze`}
          />
        </div>
      </div>
    </Card>
  )
}
