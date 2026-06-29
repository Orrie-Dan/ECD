import { type ReactNode } from 'react'
import type { AttendanceFilter, AttendanceSort, AgeGroupFilter } from '@/lib/attendance-utils'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { SelectInput } from '@/components/ui/FormField'

interface AttendanceFiltersProps {
  filter: AttendanceFilter
  onFilterChange: (f: AttendanceFilter) => void
  ageGroup: AgeGroupFilter
  onAgeGroupChange: (g: AgeGroupFilter) => void
  sort: AttendanceSort
  onSortChange: (s: AttendanceSort) => void
}

const statusFilters: { value: AttendanceFilter; label: string }[] = [
  { value: 'all', label: caretaker.attendance.filterAll },
  { value: 'present', label: caretaker.attendance.filterPresent },
  { value: 'absent', label: caretaker.attendance.filterAbsent },
]

const ageFilters: { value: AgeGroupFilter; label: string }[] = [
  { value: 'all', label: caretaker.attendance.ageAll },
  { value: '3-4', label: caretaker.attendance.age34 },
  { value: '5-6', label: caretaker.attendance.age56 },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-caption font-semibold whitespace-nowrap
        transition-colors min-h-[40px] border
        ${active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-surface text-text-secondary border-border hover:border-primary/30 hover:bg-primary-light/50'}
      `}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

export function AttendanceFilters({
  filter,
  onFilterChange,
  ageGroup,
  onAgeGroupChange,
  sort,
  onSortChange,
}: AttendanceFiltersProps) {
  return (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={common.ui.filtering}>
        {statusFilters.map((f) => (
          <Chip key={f.value} active={filter === f.value} onClick={() => onFilterChange(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={common.ui.ages}>
        {ageFilters.map((f) => (
          <Chip key={f.value} active={ageGroup === f.value} onClick={() => onAgeGroupChange(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="attendance-sort" className="text-caption font-medium text-text-secondary shrink-0">
          {caretaker.attendance.sortLabel}:
        </label>
        <SelectInput
          id="attendance-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as AttendanceSort)}
          className="!min-h-10 text-caption"
        >
          <option value="absent-first">{caretaker.attendance.sortAbsentFirst}</option>
          <option value="name-asc">{caretaker.attendance.sortNameAsc}</option>
          <option value="name-desc">{caretaker.attendance.sortNameDesc}</option>
          <option value="recent-first">{caretaker.attendance.sortRecentFirst}</option>
        </SelectInput>
      </div>
    </div>
  )
}
