import { caretaker } from '@/locales/rw/caretaker'
import { gender as genderLabels } from '@/locales/rw/common'
import { getGuardianRelationLabel } from '@/lib/guardian-relations'
import { getProvinceDisplayName } from '@/lib/rwanda-admin'
import type { ListViewState } from '@/components/ui/ListControlBar'
import {
  DEFAULT_ATTENDANCE_SEARCH,
  DEFAULT_CHILDREN_SEARCH,
  type AttendanceSearchFilters,
  type ChildrenSearchFilters,
  isAttendanceSearchActive,
  isChildrenSearchActive,
} from '@/lib/child-filters'

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return ''
  if (clauses.length === 1) return clauses[0]
  if (clauses.length === 2) return `${clauses[0]} kandi ${clauses[1]}`
  const last = clauses[clauses.length - 1]
  const rest = clauses.slice(0, -1).join(', ')
  return `${rest}, kandi ${last}`
}

function sharedClauses(filters: ChildrenSearchFilters | AttendanceSearchFilters): string[] {
  const clauses: string[] = []

  if (filters.childName.trim()) {
    clauses.push(`amazina arimo "${filters.childName.trim()}"`)
  }

  if (filters.gender !== 'all') {
    clauses.push(`a ${genderLabels[filters.gender].toLowerCase()}`)
  }

  if (filters.age === '3-4') {
    clauses.push(`bafite imyaka 3 kugeza kuri 4`)
  } else if (filters.age === '5-6') {
    clauses.push(`bafite imyaka 5 kugeza kuri 6`)
  }

  if (filters.district) {
    clauses.push(`bo mu Karere ka ${filters.district}`)
  } else if (filters.province) {
    clauses.push(`bo mu ${getProvinceDisplayName(filters.province)}`)
  }

  if (filters.sector) {
    clauses.push(`baturiye mu Murenge wa ${filters.sector}`)
  }
  if (filters.cell) {
    clauses.push(`baturiye mu Kagari ka ${filters.cell}`)
  }
  if (filters.village) {
    clauses.push(`baturiye mu Mudugudu wa ${filters.village}`)
  }

  if (filters.guardianName.trim()) {
    clauses.push(`ababyeyi/bamurera bafite amazina arimo "${filters.guardianName.trim()}"`)
  }

  if (filters.guardianRelation) {
    clauses.push(`isano ni "${getGuardianRelationLabel(filters.guardianRelation)}"`)
  }

  return clauses
}

export function buildChildrenFilterSummary(
  filters: ChildrenSearchFilters,
  viewState: ListViewState,
): string | null {
  const clauses = sharedClauses(filters)

  if (viewState === 'waiting') {
    clauses.push('abataraza uyu munsi')
  } else if (viewState === 'arrived') {
    clauses.push('abaje uyu munsi')
  }

  if (filters.sort === 'registered-desc') {
    clauses.push('banditswe vuba')
  }

  if (clauses.length === 0) return null

  return `Urimo kubona abana ${joinClauses(clauses)}.`
}

export function buildAttendanceFilterSummary(
  filters: AttendanceSearchFilters,
  viewState: ListViewState,
): string | null {
  const clauses = sharedClauses(filters)

  if (viewState === 'waiting') {
    clauses.push('abataraza')
  } else if (viewState === 'arrived') {
    clauses.push('abahageze uyu munsi')
  }

  if (clauses.length === 0) return null

  return `Urimo kubona abana ${joinClauses(clauses)}.`
}

export function formatResultsCount(count: number): string {
  return caretaker.filters.resultsFound.replace('{count}', String(count))
}

export function hasActiveChildrenFilters(
  filters: ChildrenSearchFilters,
  viewState: ListViewState,
): boolean {
  return isChildrenSearchActive(filters) || viewState !== 'waiting'
}

export function hasActiveAttendanceFilters(
  filters: AttendanceSearchFilters,
  viewState: ListViewState,
): boolean {
  return isAttendanceSearchActive(filters) || viewState !== 'waiting'
}

export function getChildrenDefaultFilters(): ChildrenSearchFilters {
  return DEFAULT_CHILDREN_SEARCH
}

export function getAttendanceDefaultFilters(): AttendanceSearchFilters {
  return DEFAULT_ATTENDANCE_SEARCH
}
