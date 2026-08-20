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

/** True when the child should count toward centre enrollment (attendance, dashboard, etc.). */
export function isEnrolledChild(child: Child): boolean {
  return child.status === 'active'
}

/** Active children at this centre, optionally excluding pending outgoing transfers. */
export function filterEnrolledChildren(
  children: Child[],
  excludeChildIds?: ReadonlySet<string>,
): Child[] {
  return children.filter(
    (child) => isEnrolledChild(child) && !(excludeChildIds?.has(child.id) ?? false),
  )
}

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

  if (filters.status === 'active') {
    result = result.filter((c) => c.status === 'active')
  } else if (filters.status === 'archived') {
    result = result.filter((c) => c.status === 'archived')
  }

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
