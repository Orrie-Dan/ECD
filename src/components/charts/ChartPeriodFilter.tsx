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
}

export function ChartPeriodFilter({
  value,
  onChange,
  showMonthFilter = true,
  className = '',
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

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Calendar size={16} className="text-text-muted shrink-0" aria-hidden />
        <SelectInput
          value={value.period}
          onChange={handlePeriodChange}
          className="min-h-10! w-full"
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
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays size={16} className="text-text-muted shrink-0" aria-hidden />
          <SelectInput
            value={value.month}
            onChange={handleMonthChange}
            className="min-h-10! w-full"
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
