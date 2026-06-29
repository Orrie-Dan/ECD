import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { ENROLLMENT_TREND_BY_PERIOD } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { ChildrenSort } from '@/lib/child-filters'
import type { EnrollmentPeriod } from '@/types'

interface DistrictChildrenFilterBarProps {
  childName: string
  onChildNameChange: (value: string) => void
  sort: ChildrenSort
  onSortChange: (sort: ChildrenSort) => void
  period: EnrollmentPeriod
  onPeriodChange: (period: EnrollmentPeriod) => void
  yearMonth: string | null
  onYearMonthChange: (month: string | null) => void
  onOpenAdvancedFilters: () => void
  onClearFilters: () => void
  hasActiveAdvancedFilters: boolean
  showClearFilters: boolean
  searchLoading?: boolean
}

const sortOptions: { value: ChildrenSort; label: string }[] = [
  { value: 'name-asc', label: caretaker.filters.sortNameAsc },
  { value: 'name-desc', label: caretaker.filters.sortNameDesc },
  { value: 'registered-desc', label: caretaker.filters.sortRegisteredDesc },
]

const periodOptions: { value: EnrollmentPeriod; label: string }[] = [
  { value: 'today', label: district.children.periodToday },
  { value: 'week', label: district.children.periodWeek },
  { value: 'month', label: district.children.periodMonth },
  { value: 'year', label: district.children.periodYear },
]

const selectClassName =
  '!min-h-11 sm:!min-h-10 w-full text-body font-semibold rounded-xl border-border bg-surface transition-shadow hover:shadow-sm'

export function DistrictChildrenFilterBar({
  childName,
  onChildNameChange,
  sort,
  onSortChange,
  period,
  onPeriodChange,
  yearMonth,
  onYearMonthChange,
  onOpenAdvancedFilters,
  onClearFilters,
  hasActiveAdvancedFilters,
  showClearFilters,
  searchLoading = false,
}: DistrictChildrenFilterBarProps) {
  const sortSelectId = useMemo(() => 'district-children-sort', [])
  const periodSelectId = useMemo(() => 'district-children-period', [])
  const monthSelectId = useMemo(() => 'district-children-month', [])

  const monthOptions = useMemo(
    () => [
      { value: '', label: district.children.allMonths },
      ...ENROLLMENT_TREND_BY_PERIOD.year.map(({ label }) => ({ value: label, label })),
    ],
    [],
  )

  const gridClass =
    period === 'year'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-2'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-2'

  return (
    <div className="flex flex-col gap-2.5 mb-3">
      <SearchInput
        value={childName}
        onChange={onChildNameChange}
        placeholder={district.children.searchPlaceholder}
        loading={searchLoading}
        className="w-full"
      />

      <div className={gridClass}>
        <SelectInput
          id={sortSelectId}
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ChildrenSort)}
          aria-label={caretaker.filters.sortLabel}
          className={selectClassName}
        >
          {sortOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          id={periodSelectId}
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as EnrollmentPeriod)}
          aria-label={district.children.filterPeriod}
          className={selectClassName}
        >
          {periodOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectInput>

        {period === 'year' && (
          <SearchableSelect
            id={monthSelectId}
            value={yearMonth ?? ''}
            onChange={(value) => onYearMonthChange(value || null)}
            options={monthOptions}
            placeholder={district.children.selectMonth}
            searchPlaceholder={district.children.searchMonthPlaceholder}
            aria-label={district.children.selectMonth}
          />
        )}

        <Button
          variant="secondary"
          size="md"
          icon={<Search size={18} />}
          onClick={onOpenAdvancedFilters}
          className="relative w-full sm:col-span-2 lg:col-span-1 transition-shadow hover:shadow-md"
          aria-label={caretaker.filters.openPanel}
        >
          <span className="hidden sm:inline">{caretaker.filters.openPanelShort}</span>
          <span className="sm:hidden">{caretaker.filters.openPanel}</span>
          {hasActiveAdvancedFilters && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface"
              aria-hidden="true"
            />
          )}
        </Button>

        {showClearFilters && (
          <Button
            variant="tertiary"
            size="md"
            icon={<X size={18} />}
            onClick={onClearFilters}
            className="w-full sm:col-span-2 lg:col-span-1 whitespace-nowrap"
          >
            {common.clearFilters}
          </Button>
        )}
      </div>
    </div>
  )
}
