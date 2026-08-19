import { caretaker } from '@/locales/rw/caretaker'
import { gender as genderLabels } from '@/locales/rw/common'
import { getGuardianRelationLabel } from '@/lib/guardian-relations'
import { getProvinceDisplayName } from '@/lib/rwanda-admin'
import type { ListViewState } from '@/components/ui/ListControlBar'
import {
  DEFAULT_ATTENDANCE_SEARCH,
  DEFAULT_CHILDREN_SEARCH,
  DEFAULT_ROSTER_SEARCH,
  type AttendanceSearchFilters,
  type ChildrenSearchFilters,
  type RosterSearchFilters,
  isAttendanceSearchActive,
  isChildrenSearchActive,
  isRosterSearchActive,
} from '@/lib/child-filters'
import type { GrowthListFilter } from '@/lib/nutrition-utils'
import type { StedListFilter } from '@/lib/sted-utils'

export type { StedListFilter }

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return ''
  if (clauses.length === 1) return clauses[0]
  if (clauses.length === 2) return `${clauses[0]} kandi ${clauses[1]}`
  const last = clauses[clauses.length - 1]
  const rest = clauses.slice(0, -1).join(', ')
  return `${rest}, kandi ${last}`
}

function sharedClauses(
  filters: ChildrenSearchFilters | AttendanceSearchFilters | RosterSearchFilters,
): string[] {
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

  if (filters.status === 'active') {
    clauses.push('bakora')
  } else if (filters.status === 'archived') {
    clauses.push('bari mu bubiko')
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
    clauses.push('abatarandikwa')
  } else if (viewState === 'arrived') {
    clauses.push('abaje')
  } else if (viewState === 'absent') {
    clauses.push('abataje')
  }

  if (clauses.length === 0) return null

  return `Urimo kubona abana ${joinClauses(clauses)}.`
}

function growthViewClause(view: GrowthListFilter): string | null {
  switch (view) {
    case 'due':
      return 'basabwa gupimwa'
    case 'overdue':
      return 'bafite ipimo rirataye'
    case 'at_risk':
      return 'bakeneye gukurikiranwa'
    case 'up_to_date':
      return 'bafite ipimo riri ku gihe'
    default:
      return null
  }
}

export function buildGrowthFilterSummary(
  filters: RosterSearchFilters,
  view: GrowthListFilter,
): string | null {
  const clauses = sharedClauses(filters)
  const viewClause = growthViewClause(view)
  if (viewClause) clauses.push(viewClause)
  if (clauses.length === 0) return null
  return `Urimo kubona abana ${joinClauses(clauses)}.`
}

function stedViewClause(view: StedListFilter): string | null {
  switch (view) {
    case 'due':
      return 'basabwa gusubiramo'
    case 'referred':
      return 'byoherejweho'
    case 'assessed':
      return 'basuzumwe'
    default:
      return null
  }
}

export function buildStedFilterSummary(
  filters: RosterSearchFilters,
  view: StedListFilter,
): string | null {
  const clauses = sharedClauses(filters)
  const viewClause = stedViewClause(view)
  if (viewClause) clauses.push(viewClause)
  if (clauses.length === 0) return null
  return `Urimo kubona abana ${joinClauses(clauses)}.`
}

export type ReferralListFilter = 'all' | 'pending' | 'completed' | 'cancelled' | 'overdue'

function referralViewClause(view: ReferralListFilter): string | null {
  switch (view) {
    case 'pending':
      return 'bitegereje'
    case 'completed':
      return 'byakozwe'
    case 'cancelled':
      return 'byahagaritswe'
    case 'overdue':
      return 'byarenze igihe'
    default:
      return null
  }
}

export function buildReferralFilterSummary(
  filters: RosterSearchFilters,
  view: ReferralListFilter,
): string | null {
  const clauses = sharedClauses(filters)
  const viewClause = referralViewClause(view)
  if (viewClause) clauses.push(viewClause)
  if (clauses.length === 0) return null
  return `Urimo kubona ihererekanya ${joinClauses(clauses)}.`
}

export function formatResultsCount(count: number): string {
  return caretaker.filters.resultsFound.replace('{count}', String(count))
}

export function hasActiveChildrenFilters(
  filters: ChildrenSearchFilters,
  viewState: ListViewState,
): boolean {
  return isChildrenSearchActive(filters) || viewState !== 'all'
}

export function hasActiveAttendanceFilters(
  filters: AttendanceSearchFilters,
  viewState: ListViewState,
): boolean {
  return isAttendanceSearchActive(filters) || viewState !== 'all'
}

export function hasActiveGrowthFilters(
  filters: RosterSearchFilters,
  view: GrowthListFilter,
  defaultView: GrowthListFilter = 'due',
): boolean {
  return isRosterSearchActive(filters) || view !== defaultView
}

export function hasActiveStedFilters(
  filters: RosterSearchFilters,
  view: StedListFilter,
  defaultView: StedListFilter = 'due',
): boolean {
  return isRosterSearchActive(filters) || view !== defaultView
}

export function hasActiveReferralFilters(
  filters: RosterSearchFilters,
  view: ReferralListFilter,
  defaultView: ReferralListFilter = 'pending',
): boolean {
  return isRosterSearchActive(filters) || view !== defaultView
}

export function getChildrenDefaultFilters(): ChildrenSearchFilters {
  return DEFAULT_CHILDREN_SEARCH
}

export function getAttendanceDefaultFilters(): AttendanceSearchFilters {
  return DEFAULT_ATTENDANCE_SEARCH
}

export function getRosterDefaultFilters(): RosterSearchFilters {
  return DEFAULT_ROSTER_SEARCH
}
