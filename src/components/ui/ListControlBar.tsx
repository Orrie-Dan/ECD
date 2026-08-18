import { Search } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'

/** Attendance / children list view states. */
export type ListViewState = 'all' | 'waiting' | 'arrived' | 'absent'

export interface ListViewOption {
  value: string
  label: string
}

interface ListControlBarProps {
  childName: string
  onChildNameChange: (value: string) => void
  viewState: string
  onViewStateChange: (state: string) => void
  /** Domain-specific options for the Reba dropdown. */
  viewOptions: ListViewOption[]
  onOpenSearchFilters: () => void
  hasActiveSearchFilters?: boolean
  searchPlaceholder?: string
  className?: string
}

/**
 * Shared caretaker list toolbar: quick name search + view select + advanced filters.
 * Matches Children / Attendance filter UX; pass domain viewOptions per page.
 */
export function ListControlBar({
  childName,
  onChildNameChange,
  viewState,
  onViewStateChange,
  viewOptions,
  onOpenSearchFilters,
  hasActiveSearchFilters = false,
  searchPlaceholder = caretaker.filters.quickSearchPlaceholder,
  className = '',
}: ListControlBarProps) {
  return (
    <div className={`flex flex-col gap-3 mb-4 sm:flex-row ${className}`}>
      <SearchInput
        value={childName}
        onChange={onChildNameChange}
        placeholder={searchPlaceholder}
        className="flex-1 min-w-0 w-full"
      />

      <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
        <SelectInput
          value={viewState}
          onChange={(e) => onViewStateChange(e.target.value)}
          aria-label={caretaker.filters.stateLabel}
          className="!min-h-11 sm:!min-h-12 flex-1 sm:flex-none sm:min-w-44 sm:w-auto text-body font-semibold"
        >
          {viewOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>

        <Button
          variant="secondary"
          size="md"
          icon={<Search size={18} />}
          onClick={onOpenSearchFilters}
          className="relative shrink-0"
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

/** Default attendance/children view options for pages that still use ListViewState. */
export const ATTENDANCE_VIEW_OPTIONS: ListViewOption[] = [
  { value: 'waiting', label: caretaker.filters.stateWaiting },
  { value: 'arrived', label: caretaker.filters.stateArrived },
  { value: 'all', label: caretaker.filters.stateAll },
]

export const CHILDREN_VIEW_OPTIONS: ListViewOption[] = [
  { value: 'waiting', label: caretaker.filters.stateWaiting },
  { value: 'arrived', label: caretaker.filters.stateArrived },
  { value: 'all', label: caretaker.filters.stateAll },
]
