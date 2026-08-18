import type { AbsentReason, AttendanceDayStatus, AttendanceRecord, Child, EcdCenter } from '@/types'
import { calculateAge } from '@/lib/mock-data'
import { OTHER_RELATION_VALUE, normalizeGuardianRelation, getGuardianRelationLabel } from '@/lib/guardian-relations'
import { applySharedChildFilters, type AttendanceSearchFilters } from '@/lib/child-filters'
import { caretaker } from '@/locales/rw/caretaker'

export type AttendanceFilter = 'all' | 'present' | 'absent' | 'unrecorded'
export type AttendanceSort = 'absent-first' | 'name-asc' | 'name-desc' | 'recent-first'
export type AgeGroupFilter = 'all' | '3-4' | '5-6'

/** Placeholder cutoff for "late" arrivals (HH:mm, local). */
export const LATE_ARRIVAL_CUTOFF = '08:30'

/** Days of attendance kept in the caretaker LIVE window. */
export const ATTENDANCE_LOOKBACK_DAYS = 40

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getYesterdayDate(): string {
  return shiftIsoDate(getTodayDate(), -1)
}

/** Shift a YYYY-MM-DD value by whole local calendar days. */
export function shiftIsoDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function clampIsoDate(dateStr: string, minDate: string, maxDate: string): string {
  if (!dateStr) return maxDate
  if (dateStr < minDate) return minDate
  if (dateStr > maxDate) return maxDate
  return dateStr
}

export function attendanceMinDate(
  maxDate = getTodayDate(),
  lookbackDays = ATTENDANCE_LOOKBACK_DAYS,
): string {
  return shiftIsoDate(maxDate, -lookbackDays)
}

export function getRecordForDate(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): AttendanceRecord | undefined {
  return attendance.find((record) => record.childId === childId && record.date === date)
}

export function getDayStatus(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): AttendanceDayStatus {
  const record = getRecordForDate(attendance, childId, date)
  if (!record) return 'unrecorded'
  return record.present ? 'present' : 'absent'
}

export function isPresentOnDate(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): boolean {
  return getDayStatus(attendance, childId, date) === 'present'
}

export function isExplicitlyAbsentOnDate(
  attendance: AttendanceRecord[],
  childId: string,
  date: string,
): boolean {
  return getDayStatus(attendance, childId, date) === 'absent'
}

export function formatArrivalTime(iso?: string): string {
  if (!iso) return '—'
  if (/^\d{2}:\d{2}$/.test(iso)) return iso
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString('rw-RW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function timeInputFromIso(iso?: string): string {
  if (!iso) {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
  if (/^\d{2}:\d{2}$/.test(iso)) return iso
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '08:00'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function isoFromDateAndTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00`
}

export function isLateArrival(arrivedAt?: string, cutoff = LATE_ARRIVAL_CUTOFF): boolean {
  if (!arrivedAt) return false
  const time = formatArrivalTime(arrivedAt)
  if (time === '—') return false
  return time > cutoff
}

export function getAbsentReasonLabel(reason?: AbsentReason): string {
  if (!reason) return '—'
  return caretaker.attendance.reasons[reason]
}

export function getAgeGroup(age: number): '3-4' | '5-6' | 'other' {
  if (age >= 3 && age <= 4) return '3-4'
  if (age >= 5 && age <= 6) return '5-6'
  return 'other'
}

export function getBroughtByLabel(
  broughtBy?: string,
  broughtByOther?: string,
  relations?: Record<string, string>,
): string {
  if (!broughtBy) return '—'
  if ((broughtBy === OTHER_RELATION_VALUE || broughtBy === 'undi') && broughtByOther) return broughtByOther
  const normalized = normalizeGuardianRelation(broughtBy) ?? broughtBy
  return relations?.[normalized] ?? getGuardianRelationLabel(normalized)
}

export function getLastAttendanceRecord(
  attendance: AttendanceRecord[],
  childId: string,
): AttendanceRecord | undefined {
  return attendance
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
}

export interface AttendanceSummaryStats {
  total: number
  present: number
  absent: number
  unrecorded: number
  rate: number
  lateArrivals: number | null
}

export function computeAttendanceSummary(
  children: Child[],
  attendance: AttendanceRecord[],
  date: string,
  options?: { includeLate?: boolean },
): AttendanceSummaryStats {
  let present = 0
  let absent = 0
  let unrecorded = 0
  let lateArrivals = 0

  for (const child of children) {
    const status = getDayStatus(attendance, child.id, date)
    if (status === 'present') {
      present++
      const record = getRecordForDate(attendance, child.id, date)
      if (isLateArrival(record?.arrivedAt)) lateArrivals++
    } else if (status === 'absent') {
      absent++
    } else {
      unrecorded++
    }
  }

  const total = children.length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  return {
    total,
    present,
    absent,
    unrecorded,
    rate,
    lateArrivals: options?.includeLate === false ? null : lateArrivals,
  }
}

/** Inclusive day count between ISO date strings (YYYY-MM-DD). */
export function countDaysInRange(dateFrom: string, dateTo: string): number {
  const from = new Date(`${dateFrom}T00:00:00`)
  const to = new Date(`${dateTo}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
}

export function clampDateRange(dateFrom: string, dateTo: string, maxDate: string): { from: string; to: string } {
  let from = dateFrom
  let to = dateTo
  if (from > maxDate) from = maxDate
  if (to > maxDate) to = maxDate
  if (from > to) return { from: to, to: from }
  return { from, to }
}

export function filterAttendanceByRange(
  attendance: AttendanceRecord[],
  dateFrom: string,
  dateTo: string,
  childIds?: Set<string>,
): AttendanceRecord[] {
  return attendance.filter((record) => {
    if (record.date < dateFrom || record.date > dateTo) return false
    if (childIds && !childIds.has(record.childId)) return false
    return true
  })
}

/** Summary from recorded attendance rows (multi-day reporting). */
export function computeRecordsSummary(
  records: AttendanceRecord[],
  options?: { includeLate?: boolean },
): AttendanceSummaryStats {
  let present = 0
  let absent = 0
  let lateArrivals = 0

  for (const record of records) {
    if (record.present) {
      present++
      if (isLateArrival(record.arrivedAt)) lateArrivals++
    } else {
      absent++
    }
  }

  const total = records.length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  return {
    total,
    present,
    absent,
    unrecorded: 0,
    rate,
    lateArrivals: options?.includeLate === false ? null : lateArrivals,
  }
}

export function filterRecordsByStatus(
  records: AttendanceRecord[],
  status: AttendanceDayStatus | 'all',
): AttendanceRecord[] {
  if (status === 'all') return records
  if (status === 'unrecorded') return []
  return records.filter((record) => (record.present ? 'present' : 'absent') === status)
}

export function filterRecordsByChildSearch(
  records: AttendanceRecord[],
  children: Child[],
  search: string,
): AttendanceRecord[] {
  const q = search.trim().toLowerCase()
  if (!q) return records
  const matchingIds = new Set(
    children
      .filter(
        (child) =>
          child.fullName.toLowerCase().includes(q) ||
          child.guardianName.toLowerCase().includes(q),
      )
      .map((child) => child.id),
  )
  return records.filter((record) => matchingIds.has(record.childId))
}

function clampRate(n: number): number {
  return Math.max(35, Math.min(100, Math.round(n)))
}

/** Deterministic mock attendance rate for a center over a date range. */
export function getCenterRangeAttendanceRate(
  center: EcdCenter,
  dateFrom: string,
  dateTo: string,
): number {
  const days = countDaysInRange(dateFrom, dateTo)
  const seed = Number.parseInt(center.id.replace(/\D/g, ''), 10) || 1
  const variance = Math.round(Math.sin(seed + days) * 4) - Math.min(Math.max(days - 1, 0), 6)
  return clampRate(center.attendance + variance)
}

export interface CenterAttendanceComparisonRow {
  center: EcdCenter
  rate: number
  presentEstimate: number
  absentEstimate: number
  totalRecords: number
}

export function buildCenterAttendanceComparison(
  centers: EcdCenter[],
  dateFrom: string,
  dateTo: string,
): CenterAttendanceComparisonRow[] {
  const days = Math.max(countDaysInRange(dateFrom, dateTo), 1)
  return centers
    .map((center) => {
      const rate = getCenterRangeAttendanceRate(center, dateFrom, dateTo)
      const totalRecords = center.children * days
      const presentEstimate = Math.round((totalRecords * rate) / 100)
      return {
        center,
        rate,
        presentEstimate,
        absentEstimate: totalRecords - presentEstimate,
        totalRecords,
      }
    })
    .sort((a, b) => b.rate - a.rate || a.center.name.localeCompare(b.center.name, 'rw'))
}

export function computeDistrictAttendanceSummary(
  rows: CenterAttendanceComparisonRow[],
): AttendanceSummaryStats {
  let total = 0
  let present = 0
  let absent = 0

  for (const row of rows) {
    total += row.totalRecords
    present += row.presentEstimate
    absent += row.absentEstimate
  }

  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  return {
    total,
    present,
    absent,
    unrecorded: 0,
    rate,
    lateArrivals: null,
  }
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
    result = result.filter((c) => todayRecords.get(c.id)?.present === true)
  } else if (filter === 'absent') {
    result = result.filter((c) => todayRecords.get(c.id)?.present === false)
  } else if (filter === 'unrecorded') {
    result = result.filter((c) => !todayRecords.has(c.id))
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
  limit = 50,
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
  // Unrecorded only — do not treat explicit absences as waiting
  let result = children.filter((c) => !todayRecords.has(c.id))
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
    children.filter((child) => todayRecords.get(child.id)?.present === true),
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

export function filterAbsentChildren({
  children,
  todayRecords,
  filters,
}: {
  children: Child[]
  todayRecords: Map<string, AttendanceRecord>
  filters: AttendanceSearchFilters
}): RecentArrival[] {
  const filteredChildren = applySharedChildFilters(
    children.filter((child) => todayRecords.get(child.id)?.present === false),
    filters,
  )

  return filteredChildren
    .map((child) => ({
      child,
      record: todayRecords.get(child.id)!,
    }))
    .sort((a, b) => a.child.fullName.localeCompare(b.child.fullName, 'rw'))
}

export type AttendanceRosterFilter = 'all' | 'waiting' | 'arrived' | 'absent'

export interface AttendanceDayRow {
  child: Child
  status: AttendanceDayStatus
  record?: AttendanceRecord
  previous?: AttendanceRecord
}

const ROSTER_STATUS_RANK: Record<AttendanceDayStatus, number> = {
  present: 0,
  absent: 1,
  unrecorded: 2,
}

/** One row per child for a selected day — present/absent first so the roster is readable. */
export function buildAttendanceDayRows({
  children,
  attendance,
  date,
  filters,
  viewState,
}: {
  children: Child[]
  attendance: AttendanceRecord[]
  date: string
  filters: AttendanceSearchFilters
  viewState: AttendanceRosterFilter
}): AttendanceDayRow[] {
  const filteredChildren = applySharedChildFilters(children, filters)

  let rows: AttendanceDayRow[] = filteredChildren.map((child) => {
    const record = getRecordForDate(attendance, child.id, date)
    const status = record ? (record.present ? 'present' : 'absent') : 'unrecorded'
    const previous = attendance
      .filter((entry) => entry.childId === child.id && entry.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    return { child, status, record, previous }
  })

  if (viewState === 'waiting') {
    rows = rows.filter((row) => row.status === 'unrecorded')
  } else if (viewState === 'arrived') {
    rows = rows.filter((row) => row.status === 'present')
  } else if (viewState === 'absent') {
    rows = rows.filter((row) => row.status === 'absent')
  }

  rows.sort((a, b) => {
    const rank = ROSTER_STATUS_RANK[a.status] - ROSTER_STATUS_RANK[b.status]
    if (rank !== 0) return rank
    if (a.status === 'present') {
      return (b.record?.arrivedAt ?? '').localeCompare(a.record?.arrivedAt ?? '')
        || a.child.fullName.localeCompare(b.child.fullName, 'rw')
    }
    return a.child.fullName.localeCompare(b.child.fullName, 'rw')
  })

  return rows
}

export function formatRelativeDayLabel(dateStr: string): string {
  const today = getTodayDate()
  const yesterdayStr = getYesterdayDate()

  if (dateStr === today) return ''
  if (dateStr === yesterdayStr) return 'Ejo'
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('rw-RW', { day: 'numeric', month: 'short' })
}
