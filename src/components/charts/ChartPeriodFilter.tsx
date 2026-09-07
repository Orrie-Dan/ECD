import { Calendar, CalendarDays } from 'lucide-react'
import { SelectInput } from '@/components/ui/FormField'
import { district } from '@/locales/rw/district'
import { CHART_MONTH_OPTIONS, CHART_PERIOD_OPTIONS } from '@/lib/chart-period'
import type { EnrollmentPeriod } from '@/types'

export interface ChartPeriodFilterValue {
  period: EnrollmentPeriod
  month: string
}

interface ChartPeriodFilterProps {
  value: ChartPeriodFilterValue
  onChange: (value: ChartPeriodFilterValue) => void
  showMonthFilter?: boolean
  className?: string
  /** Hide built-in icons and borders so a parent can frame the control. */
  compact?: boolean
}

export function ChartPeriodFilter({
  value,
  onChange,
  showMonthFilter = true,
  className = '',
  compact = false,
}: ChartPeriodFilterProps) {
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const period = e.target.value as EnrollmentPeriod
    onChange({
      period,
      month: period === 'year' ? value.month : '',
    })
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, month: e.target.value })
  }

  const selectClass = compact
    ? 'min-h-10! w-full border-0 bg-transparent px-0 shadow-none'
    : 'min-h-10! w-full'

  return (
    <div
      className={
        compact
          ? `flex min-w-0 flex-wrap items-center gap-2 ${className}`
          : `grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        {!compact ? <Calendar size={16} className="shrink-0 text-text-muted" aria-hidden /> : null}
        <SelectInput
          value={value.period}
          onChange={handlePeriodChange}
          className={selectClass}
          aria-label={district.charts.filterPeriod}
        >
          {CHART_PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectInput>
      </div>

      {showMonthFilter && value.period === 'year' && (
        <div className="flex min-w-0 items-center gap-2">
          {!compact ? (
            <CalendarDays size={16} className="shrink-0 text-text-muted" aria-hidden />
          ) : null}
          <SelectInput
            value={value.month}
            onChange={handleMonthChange}
            className={selectClass}
            aria-label={district.schools.filterMonth}
          >
            {CHART_MONTH_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>
      )}
    </div>
  )
}
