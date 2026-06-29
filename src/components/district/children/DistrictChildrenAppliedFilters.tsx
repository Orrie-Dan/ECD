import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'
import { district } from '@/locales/rw/district'
import type { EnrollmentPeriod } from '@/types'

const periodLabels: Record<EnrollmentPeriod, string> = {
  today: district.children.periodToday,
  week: district.children.periodWeek,
  month: district.children.periodMonth,
  year: district.children.periodYear,
}

interface DistrictChildrenAppliedFiltersProps {
  period: EnrollmentPeriod
  yearMonth: string | null
  resultCount: number
  searchQuery: string
  hasAdvancedFilters: boolean
  onRemovePeriod: () => void
  onRemoveMonth: () => void
  onRemoveSearch: () => void
  onClearAll: () => void
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string
  value: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1.5 rounded-full bg-surface border border-border text-caption font-semibold text-text shadow-sm transition-colors hover:border-primary/30">
      <span className="truncate">
        <span className="text-text-secondary font-medium">{label}:</span> {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="touch-target flex items-center justify-center w-7 h-7 rounded-full text-text-muted hover:text-error hover:bg-error-light transition-colors shrink-0"
        aria-label={`${caretaker.filters.clearAll} — ${label}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  )
}

export function DistrictChildrenAppliedFilters({
  period,
  yearMonth,
  resultCount,
  searchQuery,
  hasAdvancedFilters,
  onRemovePeriod,
  onRemoveMonth,
  onRemoveSearch,
  onClearAll,
}: DistrictChildrenAppliedFiltersProps) {
  const showPeriod = period !== 'month'
  const showMonth = period === 'year' && yearMonth !== null
  const showSearch = searchQuery.trim().length > 0
  const hasChips = showPeriod || showMonth || showSearch || hasAdvancedFilters

  if (!hasChips) return null

  return (
    <div className="mb-3 flex flex-col gap-2.5">
      <p className="text-caption font-semibold text-text-secondary m-0">
        {district.children.resultsFound.replace('{count}', String(resultCount))}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {showPeriod && (
          <FilterChip
            label={district.children.filterPeriod}
            value={periodLabels[period]}
            onRemove={onRemovePeriod}
          />
        )}
        {showMonth && yearMonth && (
          <FilterChip
            label={district.children.selectMonth}
            value={yearMonth}
            onRemove={onRemoveMonth}
          />
        )}
        {showSearch && (
          <FilterChip
            label={district.children.searchChipLabel}
            value={`"${searchQuery.trim()}"`}
            onRemove={onRemoveSearch}
          />
        )}
        {hasAdvancedFilters && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-light border border-primary/20 text-caption font-semibold text-primary">
            {district.children.advancedFiltersActive}
          </span>
        )}

        <Button
          variant="tertiary"
          size="sm"
          onClick={onClearAll}
          className="shrink-0 ml-auto sm:ml-0"
        >
          {caretaker.filters.clearAll}
        </Button>
      </div>
    </div>
  )
}
