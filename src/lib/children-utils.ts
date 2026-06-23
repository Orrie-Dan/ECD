import type { Child } from '@/types'
import {
  applySharedChildFilters,
  type ChildrenSearchFilters,
  type ChildrenSort,
  type GenderFilter,
  type AgeFilter,
} from '@/lib/child-filters'

export type ChildrenGenderFilter = GenderFilter
export type ChildrenAgeFilter = AgeFilter
export type ChildrenAttendanceFilter = 'all' | 'present' | 'absent'
export type { ChildrenSort }

interface FilterSortParams {
  children: Child[]
  filters: ChildrenSearchFilters
  attendanceFilter: ChildrenAttendanceFilter
  isPresentToday: (childId: string) => boolean
}

export function filterAndSortChildren({
  children,
  filters,
  attendanceFilter,
  isPresentToday,
}: FilterSortParams): Child[] {
  let result = applySharedChildFilters(children, filters)

  if (attendanceFilter === 'present') {
    result = result.filter((c) => isPresentToday(c.id))
  } else if (attendanceFilter === 'absent') {
    result = result.filter((c) => !isPresentToday(c.id))
  }

  result.sort((a, b) => {
    switch (filters.sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'rw')
      case 'registered-desc':
        return b.registeredAt.localeCompare(a.registeredAt)
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })

  return result
}
