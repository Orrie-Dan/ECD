import { Search } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import type { ListViewState } from '@/components/ui/ListControlBar'

interface AttendanceDayFiltersProps {
  childName: string
  onChildNameChange: (value: string) => void
  viewState: ListViewState
  onViewStateChange: (state: ListViewState) => void
  onOpenSearchFilters: () => void
  hasActiveSearchFilters?: boolean
  className?: string
}

/**
 * Daily attendance toolbar: search + view filter + advanced filters.
 * Desktop: search | filter select | action button in one row.
 * Mobile: stacked.
 */
export function AttendanceDayFilters({
  childName,
  onChildNameChange,
  viewState,
  onViewStateChange,
  onOpenSearchFilters,
  hasActiveSearchFilters = false,
  className = '',
}: AttendanceDayFiltersProps) {
  return (
    <div className={`flex flex-col gap-3 mb-4 sm:flex-row sm:items-stretch ${className}`}>
      <SearchInput
        value={childName}
        onChange={onChildNameChange}
        placeholder={caretaker.filters.quickSearchPlaceholder}
        className="flex-1 min-w-0 w-full"
      />

      <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
        <SelectInput
          value={viewState}
          onChange={(e) => onViewStateChange(e.target.value as ListViewState)}
          aria-label={caretaker.filters.stateLabel}
          className="min-h-11 sm:min-h-12 flex-1 sm:flex-none sm:w-44 text-body font-semibold"
        >
          <option value="waiting">{caretaker.filters.stateWaiting}</option>
          <option value="arrived">{caretaker.filters.stateArrived}</option>
          <option value="all">{caretaker.filters.stateAll}</option>
        </SelectInput>

        <Button
          variant="secondary"
          size="md"
          icon={<Search size={18} />}
          onClick={onOpenSearchFilters}
          className="relative shrink-0 min-h-11 sm:min-h-12"
        >
          <span className="hidden sm:inline">{caretaker.filters.openPanel}</span>
          <span className="sm:hidden">{caretaker.filters.openPanelShort}</span>
          {hasActiveSearchFilters && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>
    </div>
  )
}
