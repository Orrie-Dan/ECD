import type { Child, ClassroomGrade, Gender, GuardianRelation } from '@/types'
import { calculateAge } from '@/lib/mock-data'
import { getAgeGroup } from '@/lib/attendance-utils'
import { getProvinceDisplayName } from '@/lib/rwanda-admin'

export type GenderFilter = 'all' | Gender
export type AgeFilter = 'all' | '3-4' | '5-6'
export type GradeFilter = 'all' | ClassroomGrade

const GRADE_LABELS: Record<ClassroomGrade, string> = {
  grade_1: 'Umwaka wa 1',
  grade_2: 'Umwaka wa 2',
  grade_3: 'Umwaka wa 3',
}

export function getGradeLabel(grade: ClassroomGrade | undefined): string {
  return grade ? GRADE_LABELS[grade] : ''
}

export const GRADE_FILTER_OPTIONS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: 'Imyaka yose' },
  { value: 'grade_1', label: GRADE_LABELS.grade_1 },
  { value: 'grade_2', label: GRADE_LABELS.grade_2 },
  { value: 'grade_3', label: GRADE_LABELS.grade_3 },
]

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
  grade: GradeFilter
}

export type ChildrenSort = 'name-asc' | 'name-desc' | 'registered-desc'
export type AttendanceSort = 'absent-first' | 'name-asc' | 'recent-first'
export type RosterSort = 'name-asc' | 'name-desc' | 'recent-first'
export type ChildStatusFilter = 'all' | 'active' | 'archived'

export interface ChildrenSearchFilters extends SharedChildFilters {
  sort: ChildrenSort
  /** Lifecycle status filter for caretaker child list */
  status: ChildStatusFilter
}

export interface AttendanceSearchFilters extends SharedChildFilters {
  sort: AttendanceSort
}

/** Shared search filters for growth / STED / referral-style child rosters. */
export interface RosterSearchFilters extends SharedChildFilters {
  sort: RosterSort
}

export const DEFAULT_SHARED_FILTERS: SharedChildFilters = {
  childName: '',
  guardianName: '',
  guardianRelation: '',
  gender: 'all',
  age: 'all',
  grade: 'all',
  ...EMPTY_LOCATION,
}

export const DEFAULT_CHILDREN_SEARCH: ChildrenSearchFilters = {
  ...DEFAULT_SHARED_FILTERS,
  sort: 'name-asc',
  status: 'active',
}

export const DEFAULT_ATTENDANCE_SEARCH: AttendanceSearchFilters = {
  ...DEFAULT_SHARED_FILTERS,
  sort: 'absent-first',
}

export const DEFAULT_ROSTER_SEARCH: RosterSearchFilters = {
  ...DEFAULT_SHARED_FILTERS,
  sort: 'name-asc',
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
    filters.grade !== defaults.grade ||
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
  return (
    isSharedFiltersActive(filters, defaults) ||
    filters.sort !== defaults.sort ||
    filters.status !== defaults.status
  )
}

export function isAttendanceSearchActive(
  filters: AttendanceSearchFilters,
  defaults: AttendanceSearchFilters = DEFAULT_ATTENDANCE_SEARCH,
): boolean {
  return isSharedFiltersActive(filters, defaults) || filters.sort !== defaults.sort
}

export function isRosterSearchActive(
  filters: RosterSearchFilters,
  defaults: RosterSearchFilters = DEFAULT_ROSTER_SEARCH,
): boolean {
  return isSharedFiltersActive(filters, defaults) || filters.sort !== defaults.sort
}

/** @deprecated Use isChildrenSearchActive */
export const isChildrenAdvancedActive = isChildrenSearchActive
/** @deprecated Use isAttendanceSearchActive */
export const isAttendanceAdvancedActive = isAttendanceSearchActive

export function sortRosterChildren(
  children: Child[],
  sort: RosterSort,
  getRecentDate?: (childId: string) => string | undefined,
): Child[] {
  const result = [...children]
  result.sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'rw')
      case 'recent-first': {
        const aDate = getRecentDate?.(a.id) ?? ''
        const bDate = getRecentDate?.(b.id) ?? ''
        if (aDate !== bDate) return bDate.localeCompare(aDate)
        return a.fullName.localeCompare(b.fullName, 'rw')
      }
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })
  return result
}

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

  if (filters.grade !== 'all') {
    result = result.filter((c) => c.classroomGrade === filters.grade)
  }

  if (filters.province) {
    const provinceName = getProvinceDisplayName(filters.province)
    result = result.filter((c) => c.province === provinceName)
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
