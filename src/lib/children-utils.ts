import type { Child, Gender } from '@/types'
import { calculateAge } from '@/lib/mock-data'
import { getAgeGroup } from '@/lib/attendance-utils'

export type ChildrenGenderFilter = 'all' | Gender
export type ChildrenAgeFilter = 'all' | '3-4' | '5-6'
export type ChildrenAttendanceFilter = 'all' | 'present' | 'absent'
export type ChildrenSort =
  | 'name-asc'
  | 'name-desc'
  | 'registered-desc'
  | 'registered-asc'
  | 'age-asc'
  | 'age-desc'

interface FilterSortParams {
  children: Child[]
  search: string
  genderFilter: ChildrenGenderFilter
  ageFilter: ChildrenAgeFilter
  attendanceFilter: ChildrenAttendanceFilter
  sort: ChildrenSort
  isPresentToday: (childId: string) => boolean
}

export function filterAndSortChildren({
  children,
  search,
  genderFilter,
  ageFilter,
  attendanceFilter,
  sort,
  isPresentToday,
}: FilterSortParams): Child[] {
  let result = [...children]

  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.guardianName.toLowerCase().includes(q) ||
        c.guardianPhone.includes(q)
    )
  }

  if (genderFilter !== 'all') {
    result = result.filter((c) => c.gender === genderFilter)
  }

  if (ageFilter !== 'all') {
    result = result.filter((c) => getAgeGroup(calculateAge(c.dateOfBirth)) === ageFilter)
  }

  if (attendanceFilter === 'present') {
    result = result.filter((c) => isPresentToday(c.id))
  } else if (attendanceFilter === 'absent') {
    result = result.filter((c) => !isPresentToday(c.id))
  }

  result.sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'rw')
      case 'registered-desc':
        return b.registeredAt.localeCompare(a.registeredAt)
      case 'registered-asc':
        return a.registeredAt.localeCompare(b.registeredAt)
      case 'age-asc':
        return calculateAge(a.dateOfBirth) - calculateAge(b.dateOfBirth)
      case 'age-desc':
        return calculateAge(b.dateOfBirth) - calculateAge(a.dateOfBirth)
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })

  return result
}
