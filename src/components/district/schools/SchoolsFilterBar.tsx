import { X, Calendar, CalendarDays, MapPin, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { district } from '@/locales/rw/district'
import { CHART_MONTH_OPTIONS } from '@/lib/chart-period'
import type { EnrollmentPeriod } from '@/types'

export interface SchoolsFilters {
  period: EnrollmentPeriod
  month: string
  sector: string
  monitoringStatus: 'all' | 'good' | 'followup' | 'critical'
}

interface SchoolsFilterBarProps {
  filters: SchoolsFilters
  onFiltersChange: (filters: SchoolsFilters) => void
  sectors: string[]
  resultCount?: number
  onClearFilters?: () => void
  hasActiveFilters?: boolean
}

const periodOptions: { value: EnrollmentPeriod; label: string }[] = [
  { value: 'today', label: district.schools.periodToday },
  { value: 'week', label: district.schools.periodWeek },
  { value: 'month', label: district.schools.periodMonth },
  { value: 'year', label: district.schools.periodYear },
]

const monitoringStatusOptions: { value: SchoolsFilters['monitoringStatus']; label: string }[] = [
  { value: 'all', label: district.schools.statusAll },
  { value: 'good', label: district.schools.statusGood },
  { value: 'followup', label: district.schools.statusFollowup },
  { value: 'critical', label: district.schools.statusCritical },
]

const monthOptions = CHART_MONTH_OPTIONS

export function SchoolsFilterBar({
  filters,
  onFiltersChange,
  sectors,
  resultCount,
  onClearFilters,
  hasActiveFilters = false,
}: SchoolsFilterBarProps) {
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, period: e.target.value as EnrollmentPeriod })
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, month: e.target.value })
  }

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, sector: e.target.value })
  }

  const handleMonitoringStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      monitoringStatus: e.target.value as SchoolsFilters['monitoringStatus'],
    })
  }

  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={16} className="text-text-muted shrink-0" />
          <SelectInput
            value={filters.period}
            onChange={handlePeriodChange}
            className="min-h-10! w-full"
            aria-label={district.schools.filterPeriod}
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays size={16} className="text-text-muted shrink-0" />
          <SelectInput
            value={filters.month}
            onChange={handleMonthChange}
            className="min-h-10! w-full"
            aria-label={district.schools.filterMonth}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="text-text-muted shrink-0" />
          <SelectInput
            value={filters.sector}
            onChange={handleSectorChange}
            className="min-h-10! w-full"
            aria-label={district.schools.filterSector}
          >
            <option value="">{district.schools.allSectors}</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={16} className="text-text-muted shrink-0" />
          <SelectInput
            value={filters.monitoringStatus}
            onChange={handleMonitoringStatusChange}
            className="min-h-10! w-full"
            aria-label={district.schools.filterStatus}
          >
            {monitoringStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {hasActiveFilters && onClearFilters && (
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            icon={<X size={16} />}
            className="w-full sm:w-auto"
          >
            {district.schools.clearFilters}
          </Button>
        </div>
      )}

      {resultCount !== undefined && (
        <p className="text-caption text-text-secondary">
          {district.schools.resultsFound.replace('{count}', String(resultCount))}
        </p>
      )}
    </div>
  )
}
