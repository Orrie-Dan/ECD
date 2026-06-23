import type { AttendanceRecord, Child } from '@/types'
import { calculateAge } from '@/lib/mock-data'
import { OTHER_RELATION_VALUE, normalizeGuardianRelation, getGuardianRelationLabel } from '@/lib/guardian-relations'
import { applySharedChildFilters, type AttendanceSearchFilters } from '@/lib/child-filters'

export type AttendanceFilter = 'all' | 'present' | 'absent'
export type AttendanceSort = 'absent-first' | 'name-asc' | 'name-desc' | 'recent-first'
export type AgeGroupFilter = 'all' | '3-4' | '5-6'

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getYesterdayDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

export function getRecordForDate(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): AttendanceRecord | undefined {
  return attendance.find((record) => record.childId === childId && record.date === date)
}

export function isPresentOnDate(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): boolean {
  return attendance.some(
    (record) => record.childId === childId && record.date === date && record.present,
  )
}

export function formatArrivalTime(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return date.toLocaleTimeString('rw-RW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function getAgeGroup(age: number): '3-4' | '5-6' | 'other' {
  if (age >= 3 && age <= 4) return '3-4'
  if (age >= 5 && age <= 6) return '5-6'
  return 'other'
}

export function getBroughtByLabel(
  broughtBy?: string,
  broughtByOther?: string,
  relations?: Record<string, string>
): string {
  if (!broughtBy) return '—'
  if ((broughtBy === OTHER_RELATION_VALUE || broughtBy === 'undi') && broughtByOther) return broughtByOther
  const normalized = normalizeGuardianRelation(broughtBy) ?? broughtBy
  return relations?.[normalized] ?? getGuardianRelationLabel(normalized)
}

interface FilterSortParams {
  children: Child[]
  todayRecords: Map<string, AttendanceRecord>
  search: string
  filter: AttendanceFilter
  ageGroup: AgeGroupFilter
  sort: AttendanceSort
}

export function filterAndSortChildren({
  children,
  todayRecords,
  search,
  filter,
  ageGroup,
  sort,
}: FilterSortParams): Child[] {
  let result = [...children]

  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter((c) => c.fullName.toLowerCase().includes(q))
  }

  if (filter === 'present') {
    result = result.filter((c) => todayRecords.get(c.id)?.present)
  } else if (filter === 'absent') {
    result = result.filter((c) => !todayRecords.get(c.id)?.present)
  }

  if (ageGroup !== 'all') {
    result = result.filter((c) => getAgeGroup(calculateAge(c.dateOfBirth)) === ageGroup)
  }

  result.sort((a, b) => {
    const aRecord = todayRecords.get(a.id)
    const bRecord = todayRecords.get(b.id)
    const aPresent = !!aRecord?.present
    const bPresent = !!bRecord?.present

    switch (sort) {
      case 'name-asc':
        return a.fullName.localeCompare(b.fullName, 'rw')
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'rw')
      case 'recent-first': {
        const aTime = aRecord?.arrivedAt ? new Date(aRecord.arrivedAt).getTime() : 0
        const bTime = bRecord?.arrivedAt ? new Date(bRecord.arrivedAt).getTime() : 0
        return bTime - aTime
      }
      case 'absent-first':
      default:
        if (aPresent !== bPresent) return aPresent ? 1 : -1
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })

  return result
}

export interface RecentArrival {
  child: Child
  record: AttendanceRecord
}

export function getRecentArrivals(
  children: Child[],
  attendance: AttendanceRecord[],
  limit = 50
): RecentArrival[] {
  const today = getTodayDate()
  const childMap = new Map(children.map((c) => [c.id, c]))

  return attendance
    .filter((a) => a.date === today && a.present && a.arrivedAt)
    .sort((a, b) => new Date(b.arrivedAt!).getTime() - new Date(a.arrivedAt!).getTime())
    .slice(0, limit)
    .map((record) => ({ child: childMap.get(record.childId)!, record }))
    .filter((item) => item.child)
}

export function filterWaitingChildren({
  children,
  todayRecords,
  filters,
}: {
  children: Child[]
  todayRecords: Map<string, AttendanceRecord>
  filters: AttendanceSearchFilters
}): Child[] {
  let result = children.filter((c) => !todayRecords.get(c.id)?.present)
  result = applySharedChildFilters(result, filters)

  result.sort((a, b) => {
    switch (filters.sort) {
      case 'name-asc':
        return a.fullName.localeCompare(b.fullName, 'rw')
      case 'recent-first':
      case 'absent-first':
      default:
        return a.fullName.localeCompare(b.fullName, 'rw')
    }
  })

  return result
}

export function filterArrivedChildren({
  children,
  todayRecords,
  filters,
}: {
  children: Child[]
  todayRecords: Map<string, AttendanceRecord>
  filters: AttendanceSearchFilters
}): RecentArrival[] {
  const filteredChildren = applySharedChildFilters(
    children.filter((child) => todayRecords.get(child.id)?.present),
    filters,
  )

  let result: RecentArrival[] = filteredChildren.map((child) => ({
    child,
    record: todayRecords.get(child.id)!,
  }))

  result.sort((a, b) => {
    switch (filters.sort) {
      case 'name-asc':
        return a.child.fullName.localeCompare(b.child.fullName, 'rw')
      case 'recent-first': {
        const aTime = a.record.arrivedAt ? new Date(a.record.arrivedAt).getTime() : 0
        const bTime = b.record.arrivedAt ? new Date(b.record.arrivedAt).getTime() : 0
        return bTime - aTime
      }
      case 'absent-first':
      default:
        return a.child.fullName.localeCompare(b.child.fullName, 'rw')
    }
  })

  return result
}

export function formatRelativeDayLabel(dateStr: string): string {
  const today = getTodayDate()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === today) return ''
  if (dateStr === yesterdayStr) return 'Ejo'
  const date = new Date(dateStr)
  return date.toLocaleDateString('rw-RW', { day: 'numeric', month: 'short' })
}
