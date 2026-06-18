import { Plus } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'

export type ListViewState = 'all' | 'waiting'

interface ListControlBarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  viewState: ListViewState
  onViewStateChange: (state: ListViewState) => void
  onOpenAdvancedFilters: () => void
  hasActiveAdvancedFilters?: boolean
}

export function ListControlBar({
  search,
  onSearchChange,
  searchPlaceholder,
  viewState,
  onViewStateChange,
  onOpenAdvancedFilters,
  hasActiveAdvancedFilters = false,
}: ListControlBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="flex-1 min-w-0"
      />

      <div className="flex gap-2 shrink-0">
        <SelectInput
          value={viewState}
          onChange={(e) => onViewStateChange(e.target.value as ListViewState)}
          aria-label={caretaker.filters.stateLabel}
          className="!min-h-12 w-36 sm:w-40 text-body font-semibold"
        >
          <option value="waiting">{caretaker.filters.stateWaiting}</option>
          <option value="all">{caretaker.filters.stateAll}</option>
        </SelectInput>

        <Button
          variant="secondary"
          size="md"
          icon={<Plus size={18} />}
          onClick={onOpenAdvancedFilters}
          className="relative whitespace-nowrap"
        >
          <span className="hidden sm:inline">{caretaker.filters.moreFilters}</span>
          <span className="sm:hidden">{caretaker.filters.moreFiltersShort}</span>
          {hasActiveAdvancedFilters && (
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
