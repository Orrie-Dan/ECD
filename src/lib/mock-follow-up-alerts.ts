import { shiftIsoDate, getTodayDate } from '@/lib/attendance-utils'
import {
  ATTENDANCE_ABSENT_THRESHOLD,
  ATTENDANCE_RISK_WINDOW_DAYS,
  clampAbsentDaysInWindow,
} from '@/lib/attendance-absence-days'
import {
  ACTION_ALERTS,
  ATTENDANCE_THRESHOLD,
  DEFAULT_CENTER_ID,
  ECD_CENTERS,
  MOCK_ATTENDANCE,
  MOCK_CHILDREN,
} from '@/lib/mock-data'
import type { FollowUpAlertViewModel, FollowUpAlertsViewModel } from '@/models/alerts'
import type { AttendanceRecord, Child } from '@/types'
import type { FollowUpAlertsFilters } from '@/api/resources/alerts'

/** @deprecated Import ATTENDANCE_RISK_WINDOW_DAYS from attendance-absence-days */
export const ATTENDANCE_RISK_DAYS = ATTENDANCE_RISK_WINDOW_DAYS
export { ATTENDANCE_ABSENT_THRESHOLD, ATTENDANCE_RISK_WINDOW_DAYS }
/** District center-detail / monitoring follow-up threshold. */
export const LOW_CENTER_ATTENDANCE_THRESHOLD = 80

function countAbsentDaysInWindow(
  childId: string,
  attendance: readonly AttendanceRecord[],
  endDate: string,
  days: number,
): number {
  const startDate = shiftIsoDate(endDate, -(days - 1))
  const absentDates = new Set<string>()
  for (const record of attendance) {
    if (record.childId !== childId) continue
    if (record.date < startDate || record.date > endDate) continue
    if (!record.present) absentDates.add(record.date)
  }
  return clampAbsentDaysInWindow(absentDates.size, days)
}

function computeCenterAttendanceRate(
  centerId: string,
  children: readonly Child[],
  attendance: readonly AttendanceRecord[],
  endDate: string,
  days: number,
): number | null {
  const childIds = new Set(
    children.filter((child) => child.centerId === centerId && child.status === 'active').map((c) => c.id),
  )
  if (childIds.size === 0) return null

  const startDate = shiftIsoDate(endDate, -(days - 1))
  let present = 0
  let total = 0
  for (const record of attendance) {
    if (!childIds.has(record.childId)) continue
    if (record.date < startDate || record.date > endDate) continue
    total++
    if (record.present) present++
  }
  if (total === 0) return null
  return Math.round((present / total) * 100)
}

function buildChildAbsenceAlerts(
  children: readonly Child[],
  attendance: readonly AttendanceRecord[],
  centerId?: string,
  today = getTodayDate(),
): FollowUpAlertViewModel[] {
  const alerts: FollowUpAlertViewModel[] = []

  for (const child of children) {
    if (child.status !== 'active') continue
    if (centerId && child.centerId !== centerId) continue

    const absentDays = countAbsentDaysInWindow(
      child.id,
      attendance,
      today,
      ATTENDANCE_RISK_WINDOW_DAYS,
    )
    if (absentDays < ATTENDANCE_ABSENT_THRESHOLD) continue

    alerts.push({
      id: `mock-absence-${child.id}`,
      category: 'attendance',
      priority: absentDays >= 5 ? 'high' : 'medium',
      code: 'ATTENDANCE_ABSENCE_RISK',
      title: 'Repeated absences',
      description: `${child.fullName} was absent ${absentDays} days in the last ${ATTENDANCE_RISK_WINDOW_DAYS} days`,
      centerId: child.centerId,
      centerName: child.centerName,
      childId: child.id,
      childName: child.fullName,
      entityType: 'child',
      entityId: child.id,
      detectedAt: `${today}T08:00:00.000Z`,
      metrics: [
        { label: 'Absent days', value: String(absentDays) },
        { label: 'Window', value: `${ATTENDANCE_RISK_WINDOW_DAYS} days` },
      ],
    })
  }

  return alerts
}

function buildCenterLowAttendanceAlerts(
  centers: typeof ECD_CENTERS,
  children: readonly Child[],
  attendance: readonly AttendanceRecord[],
  centerId?: string,
  today = getTodayDate(),
): FollowUpAlertViewModel[] {
  const alerts: FollowUpAlertViewModel[] = []

  for (const center of centers) {
    if (centerId && center.id !== centerId) continue

    const computedRate = computeCenterAttendanceRate(
      center.id,
      children,
      attendance,
      today,
      ATTENDANCE_RISK_WINDOW_DAYS,
    )
    const rate = computedRate ?? center.attendance
    if (rate >= LOW_CENTER_ATTENDANCE_THRESHOLD) continue

    alerts.push({
      id: `mock-low-attendance-${center.id}`,
      category: 'attendance',
      priority: rate < ATTENDANCE_THRESHOLD ? 'high' : 'medium',
      code: 'ATTENDANCE_LOW_RATE',
      title: 'Low attendance rate',
      description: `${center.name} attendance is ${rate}% over the last ${ATTENDANCE_RISK_DAYS} days`,
      centerId: center.id,
      centerName: center.name,
      childId: null,
      childName: null,
      entityType: 'center',
      entityId: center.id,
      detectedAt: `${today}T08:00:00.000Z`,
      metrics: [{ label: 'Rate', value: `${rate}%` }],
    })
  }

  return alerts
}

function buildNoSubmissionTodayAlerts(
  centers: typeof ECD_CENTERS,
  centerId?: string,
  today = getTodayDate(),
): FollowUpAlertViewModel[] {
  const alerts: FollowUpAlertViewModel[] = []

  for (const center of centers) {
    if (centerId && center.id !== centerId) continue
    if (center.submittedToday) continue

    alerts.push({
      id: `mock-no-attendance-today-${center.id}`,
      category: 'data_quality',
      priority: 'medium',
      code: 'DQ_NO_ATTENDANCE_TODAY',
      title: 'No attendance recorded today',
      description: `${center.name} has active children but no attendance recorded today`,
      centerId: center.id,
      centerName: center.name,
      childId: null,
      childName: null,
      entityType: 'center',
      entityId: center.id,
      detectedAt: `${today}T08:00:00.000Z`,
      metrics: [],
    })
  }

  return alerts
}

function actionAlertToFollowUp(
  alert: (typeof ACTION_ALERTS)[number],
  today: string,
): FollowUpAlertViewModel | null {
  if (alert.category !== 'attendance' && alert.category !== 'data_quality') return null

  return {
    id: `mock-action-${alert.id}`,
    category: alert.category === 'attendance' ? 'attendance' : 'data_quality',
    priority: alert.priority,
    code:
      alert.type === 'no_submission'
        ? 'DQ_NO_ATTENDANCE_TODAY'
        : alert.type === 'low_attendance'
          ? 'ATTENDANCE_LOW_RATE'
          : 'ATTENDANCE_TREND',
    title: alert.description,
    description: alert.description,
    centerId: alert.centerId,
    centerName: alert.centerName,
    childId: null,
    childName: null,
    entityType: 'center',
    entityId: alert.centerId,
    detectedAt: `${today}T08:00:00.000Z`,
    metrics: (alert.metrics ?? []).map((metric) => ({ label: metric.label, value: metric.value })),
  }
}

function priorityRank(priority: FollowUpAlertViewModel['priority']): number {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2
}

function summarizeCounts(items: FollowUpAlertViewModel[]): FollowUpAlertsViewModel['counts'] {
  const counts: FollowUpAlertsViewModel['counts'] = {
    nutrition: 0,
    attendance: 0,
    referral: 0,
    data_quality: 0,
    sted: 0,
    transfer: 0,
    compliance: 0,
    capacity: 0,
    high: 0,
  }

  for (const alert of items) {
    if (alert.category in counts) {
      counts[alert.category as keyof Omit<FollowUpAlertsViewModel['counts'], 'high'>] += 1
    }
    if (alert.priority === 'high') counts.high += 1
  }

  return counts
}

/** MOCK follow-up alerts derived from attendance history + demo center alerts. */
export function buildMockFollowUpAlerts(
  filters: FollowUpAlertsFilters = {},
  options?: {
    children?: readonly Child[]
    attendance?: readonly AttendanceRecord[]
    today?: string
  },
): FollowUpAlertsViewModel {
  const today = options?.today ?? getTodayDate()
  const children = options?.children ?? MOCK_CHILDREN
  const attendance = options?.attendance ?? MOCK_ATTENDANCE
  const scopeCenterId = filters.centerId

  const computed = [
    ...buildChildAbsenceAlerts(children, attendance, scopeCenterId, today),
    ...buildCenterLowAttendanceAlerts(ECD_CENTERS, children, attendance, scopeCenterId, today),
    ...buildNoSubmissionTodayAlerts(ECD_CENTERS, scopeCenterId, today),
  ]

  const districtActionAlerts = scopeCenterId
    ? ACTION_ALERTS.filter((alert) => alert.centerId === scopeCenterId)
    : ACTION_ALERTS

  for (const alert of districtActionAlerts) {
    const mapped = actionAlertToFollowUp(alert, today)
    if (mapped) computed.push(mapped)
  }

  const deduped = new Map<string, FollowUpAlertViewModel>()
  for (const alert of computed) {
    const key = `${alert.code}:${alert.centerId ?? 'none'}:${alert.childId ?? 'none'}`
    const existing = deduped.get(key)
    if (!existing || priorityRank(alert.priority) < priorityRank(existing.priority)) {
      deduped.set(key, alert)
    }
  }

  let items = [...deduped.values()].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
    if (byPriority !== 0) return byPriority
    return a.title.localeCompare(b.title, 'rw')
  })

  if (filters.category && filters.category !== 'all') {
    items = items.filter((item) => item.category === filters.category)
  }

  const limit = filters.limit ?? 100
  items = items.slice(0, limit)

  return {
    items,
    total: items.length,
    counts: summarizeCounts(items),
    districtId: filters.districtId ?? null,
    centerId: scopeCenterId ?? null,
  }
}

/** Convenience for tests and caretaker default centre. */
export function buildDefaultCenterMockFollowUpAlerts(
  filters: Omit<FollowUpAlertsFilters, 'centerId'> = {},
): FollowUpAlertsViewModel {
  return buildMockFollowUpAlerts({ ...filters, centerId: DEFAULT_CENTER_ID })
}
