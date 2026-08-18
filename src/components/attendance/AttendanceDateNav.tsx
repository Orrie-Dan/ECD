import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import {
  attendanceMinDate,
  clampIsoDate,
  getTodayDate,
  getYesterdayDate,
  shiftIsoDate,
} from '@/lib/attendance-utils'

interface AttendanceDateNavProps {
  selectedDate: string
  onDateChange: (date: string) => void
  maxDate?: string
  minDate?: string
  className?: string
}

export function AttendanceDateNav({
  selectedDate,
  onDateChange,
  maxDate = getTodayDate(),
  minDate,
  className = '',
}: AttendanceDateNavProps) {
  const today = maxDate
  const yesterday = getYesterdayDate()
  const earliest = minDate ?? attendanceMinDate(today)
  const isToday = selectedDate === today
  const isYesterday = selectedDate === yesterday
  const canGoPrev = selectedDate > earliest
  const canGoNext = selectedDate < today

  const setDate = (date: string) => {
    onDateChange(clampIsoDate(date, earliest, today))
  }

  return (
    <Card padding="lg" className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-2 min-w-0 flex-1">
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<ChevronLeft size={20} />}
            onClick={() => setDate(shiftIsoDate(selectedDate, -1))}
            disabled={!canGoPrev}
            aria-label={caretaker.attendance.previousDay}
            className="px-3! shrink-0"
          >
            <span className="sr-only">{caretaker.attendance.previousDay}</span>
          </Button>

          <div className="flex-1 min-w-0">
            <FormField label={caretaker.attendance.dateLabel}>
              <TextInput
                type="date"
                value={selectedDate}
                min={earliest}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                aria-label={caretaker.attendance.dateLabel}
              />
            </FormField>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<ChevronRight size={20} />}
            onClick={() => setDate(shiftIsoDate(selectedDate, 1))}
            disabled={!canGoNext}
            aria-label={caretaker.attendance.nextDay}
            className="px-3! shrink-0"
          >
            <span className="sr-only">{caretaker.attendance.nextDay}</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isToday ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setDate(today)}
          >
            {common.today}
          </Button>
          <Button
            type="button"
            variant={isYesterday ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setDate(yesterday)}
          >
            {caretaker.attendance.yesterday}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-body text-text-secondary">
        <span className="font-semibold text-text">{formatDate(selectedDate)}</span>
        {isToday && (
          <span className="ml-2 inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-semibold text-primary">
            {common.today}
          </span>
        )}
        {isYesterday && (
          <span className="ml-2 inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-text-secondary">
            {caretaker.attendance.yesterday}
          </span>
        )}
      </p>
    </Card>
  )
}
