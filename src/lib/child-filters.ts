import type { Child, Gender, GuardianRelation } from '@/types'
import { calculateAge } from '@/lib/mock-data'
import { getAgeGroup } from '@/lib/attendance-utils'

export type GenderFilter = 'all' | Gender
export type AgeFilter = 'all' | '3-4' | '5-6'

export interface LocationFilters {
  province: string
  district: string
  sector: string
  cell: string
  village: string
}

export const EMPTY_LOCATION: LocationFilters = {
  province: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
}

export interface SharedChildFilters extends LocationFilters {
  childName: string
  guardianName: string
  guardianRelation: '' | GuardianRelation
  gender: GenderFilter
  age: AgeFilter
}

export type ChildrenSort = 'name-asc' | 'name-desc' | 'registered-desc'
export type AttendanceSort = 'absent-first' | 'name-asc' | 'recent-first'

export interface ChildrenSearchFilters extends SharedChildFilters {
  sort: ChildrenSort
}

export interface AttendanceSearchFilters extends SharedChildFilters {
  sort: AttendanceSort
}

export const DEFAULT_SHARED_FILTERS: SharedChildFilters = {
  childName: '',
  guardianName: '',
  guardianRelation: '',
  gender: 'all',
  age: 'all',
  ...EMPTY_LOCATION,
}

export const DEFAULT_CHILDREN_SEARCH: ChildrenSearchFilters = {
  ...DEFAULT_SHARED_FILTERS,
  sort: 'name-asc',
}

export const DEFAULT_ATTENDANCE_SEARCH: AttendanceSearchFilters = {
  ...DEFAULT_SHARED_FILTERS,
  sort: 'absent-first',
}

/** @deprecated Use ChildrenSearchFilters */
export type ChildrenAdvancedFilters = ChildrenSearchFilters
/** @deprecated Use AttendanceSearchFilters */
export type AttendanceAdvancedFilters = AttendanceSearchFilters
/** @deprecated Use DEFAULT_CHILDREN_SEARCH */
export const DEFAULT_CHILDREN_ADVANCED = DEFAULT_CHILDREN_SEARCH
/** @deprecated Use DEFAULT_ATTENDANCE_SEARCH */
export const DEFAULT_ATTENDANCE_ADVANCED = DEFAULT_ATTENDANCE_SEARCH

export function isSharedFiltersActive(
  filters: SharedChildFilters,
  defaults: SharedChildFilters = DEFAULT_SHARED_FILTERS,
): boolean {
  return (
    filters.childName.trim() !== defaults.childName ||
    filters.guardianName.trim() !== defaults.guardianName ||
    filters.guardianRelation !== defaults.guardianRelation ||
    filters.gender !== defaults.gender ||
    filters.age !== defaults.age ||
    filters.province !== defaults.province ||
    filters.district !== defaults.district ||
    filters.sector !== defaults.sector ||
    filters.cell !== defaults.cell ||
    filters.village !== defaults.village
  )
}

export function isChildrenSearchActive(
  filters: ChildrenSearchFilters,
  defaults: ChildrenSearchFilters = DEFAULT_CHILDREN_SEARCH,
): boolean {
  return isSharedFiltersActive(filters, defaults) || filters.sort !== defaults.sort
}

export function isAttendanceSearchActive(
  filters: AttendanceSearchFilters,
  defaults: AttendanceSearchFilters = DEFAULT_ATTENDANCE_SEARCH,
): boolean {
  return isSharedFiltersActive(filters, defaults) || filters.sort !== defaults.sort
}

/** @deprecated Use isChildrenSearchActive */
export const isChildrenAdvancedActive = isChildrenSearchActive
/** @deprecated Use isAttendanceSearchActive */
export const isAttendanceAdvancedActive = isAttendanceSearchActive

export function applySharedChildFilters(children: Child[], filters: SharedChildFilters): Child[] {
  let result = [...children]

  const childQuery = filters.childName.trim().toLowerCase()
  if (childQuery) {
    result = result.filter((c) => c.fullName.toLowerCase().includes(childQuery))
  }

  const guardianQuery = filters.guardianName.trim().toLowerCase()
  if (guardianQuery) {
    result = result.filter(
      (c) =>
        c.guardianName.toLowerCase().includes(guardianQuery) ||
        c.guardian2Name?.toLowerCase().includes(guardianQuery),
    )
  }

  if (filters.guardianRelation) {
    result = result.filter(
      (c) =>
        c.guardianRelation === filters.guardianRelation ||
        c.guardian2Relation === filters.guardianRelation,
    )
  }

  if (filters.gender !== 'all') {
    result = result.filter((c) => c.gender === filters.gender)
  }

  if (filters.age !== 'all') {
    result = result.filter((c) => getAgeGroup(calculateAge(c.dateOfBirth)) === filters.age)
  }

  if (filters.province) {
    result = result.filter((c) => c.province === filters.province)
  }
  if (filters.district) {
    result = result.filter((c) => c.district === filters.district)
  }
  if (filters.sector) {
    result = result.filter((c) => c.sector === filters.sector)
  }
  if (filters.cell) {
    result = result.filter((c) => c.cell === filters.cell)
  }
  if (filters.village) {
    result = result.filter((c) => c.village === filters.village)
  }

  return result
}

export function resetLocationField<T extends SharedChildFilters>(
  filters: T,
  field: keyof LocationFilters,
): T {
  const next = { ...filters }
  if (field === 'province') {
    next.province = ''
    next.district = ''
    next.sector = ''
    next.cell = ''
    next.village = ''
  } else if (field === 'district') {
    next.district = ''
    next.sector = ''
    next.cell = ''
    next.village = ''
  } else if (field === 'sector') {
    next.sector = ''
    next.cell = ''
    next.village = ''
  } else if (field === 'cell') {
    next.cell = ''
    next.village = ''
  } else if (field === 'village') {
    next.village = ''
  }
  return next
}
