import {
  RWANDA_MONTH_LABELS,
  type EffectiveDateRange,
} from '@/lib/chart-period'
import {
  DISTRICT_ATTENDANCE_TREND_BY_PERIOD,
  DISTRICT_SCHOOLS_TREND_BY_PERIOD,
  DISTRICT_TEACHERS_TREND_BY_PERIOD,
  DISTRICT_STATS,
  ENROLLMENT_SUMMARY_BY_PERIOD,
  ENROLLMENT_TREND_BY_PERIOD,
} from '@/lib/mock-data'

export interface DashboardPeriodStats {
  ecdCenters: number
  totalChildren: number
  presentToday: number
  attendanceRate: number
  newRegistrations: number
  dropouts: number
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function findYearRow<T extends { label: string }>(rows: T[], monthKey: string): T | undefined {
  const monthLabel = RWANDA_MONTH_LABELS[monthKey]
  if (!monthLabel) return undefined
  return rows.find((row) => row.label === monthLabel)
}

function monthHasData(monthKey: string): boolean {
  const monthLabel = RWANDA_MONTH_LABELS[monthKey]
  if (!monthLabel) return false
  return ENROLLMENT_TREND_BY_PERIOD.year.some((p) => p.label === monthLabel)
}

/** Daily enrollment points for a specific month within the year view. */
export function getDistrictEnrollmentTrendForRange(range: EffectiveDateRange) {
  if (range.isMonthDrillDown && range.monthKey) {
    if (!monthHasData(range.monthKey)) return []

    const monthLabel = range.monthLabel!
    const yearPoint = findYearRow(ENROLLMENT_TREND_BY_PERIOD.year, range.monthKey)
    if (!yearPoint) return []

    const days = getDaysInMonth(range.year, parseInt(range.monthKey, 10))
    const seed = parseInt(range.monthKey, 10)

    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      const weekday = new Date(range.year, parseInt(range.monthKey, 10) - 1, day).getDay()
      const weekdayFactor = weekday === 0 || weekday === 6 ? 0.4 : 1
      const wave = 0.7 + ((day + seed) % 5) * 0.12
      const newRegistrations = Math.max(
        0,
        Math.round((yearPoint.newRegistrations / days) * weekdayFactor * wave),
      )
      const dropouts = Math.max(
        0,
        Math.round((yearPoint.dropouts / days) * weekdayFactor * 0.6),
      )
      return {
        label: `${day} ${monthLabel}`,
        newRegistrations,
        dropouts,
        netEnrollment: newRegistrations - dropouts,
      }
    })
  }

  return ENROLLMENT_TREND_BY_PERIOD[range.period]
}

export function getDistrictAttendanceTrendForRange(range: EffectiveDateRange) {
  if (range.isMonthDrillDown && range.monthKey) {
    if (!monthHasData(range.monthKey)) return []

    const monthLabel = range.monthLabel!
    const yearPoint = findYearRow(DISTRICT_ATTENDANCE_TREND_BY_PERIOD.year, range.monthKey)
    const baseRate = yearPoint?.rate ?? DISTRICT_STATS.attendanceRate
    const days = getDaysInMonth(range.year, parseInt(range.monthKey, 10))
    const seed = parseInt(range.monthKey, 10)

    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      const weekday = new Date(range.year, parseInt(range.monthKey, 10) - 1, day).getDay()
      const weekdayPenalty = weekday === 0 ? 8 : weekday === 6 ? 4 : 0
      const wave = Math.sin((day + seed) / 3) * 3
      const noise = ((day * 13 + seed * 7) % 7) - 3
      const rate = Math.max(35, Math.min(100, Math.round(baseRate + wave + noise - weekdayPenalty)))
      return { label: `${day} ${monthLabel}`, rate }
    })
  }

  return DISTRICT_ATTENDANCE_TREND_BY_PERIOD[range.period]
}

export function getDistrictSchoolsTrendForRange(range: EffectiveDateRange) {
  if (range.isMonthDrillDown && range.monthKey) {
    if (!monthHasData(range.monthKey)) return []

    const monthLabel = range.monthLabel!
    const yearPoint = findYearRow(DISTRICT_SCHOOLS_TREND_BY_PERIOD.year, range.monthKey)
    const prevMonthKey = String(parseInt(range.monthKey, 10) - 1).padStart(2, '0')
    const prevPoint = findYearRow(DISTRICT_SCHOOLS_TREND_BY_PERIOD.year, prevMonthKey)
    const startValue = prevPoint?.value ?? (yearPoint?.value ?? 35) - 1
    const endValue = yearPoint?.value ?? startValue
    const days = getDaysInMonth(range.year, parseInt(range.monthKey, 10))

    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      const progress = day / days
      const value = Math.round(startValue + (endValue - startValue) * progress)
      return { label: `${day} ${monthLabel}`, value }
    })
  }

  return DISTRICT_SCHOOLS_TREND_BY_PERIOD[range.period]
}

export function getDistrictTeachersTrendForRange(range: EffectiveDateRange) {
  if (range.isMonthDrillDown && range.monthKey) {
    if (!monthHasData(range.monthKey)) return []

    const monthLabel = range.monthLabel!
    const yearPoint = findYearRow(DISTRICT_TEACHERS_TREND_BY_PERIOD.year, range.monthKey)
    const prevMonthKey = String(parseInt(range.monthKey, 10) - 1).padStart(2, '0')
    const prevPoint = findYearRow(DISTRICT_TEACHERS_TREND_BY_PERIOD.year, prevMonthKey)
    const startValue = prevPoint?.value ?? (yearPoint?.value ?? 38) - 1
    const endValue = yearPoint?.value ?? startValue
    const days = getDaysInMonth(range.year, parseInt(range.monthKey, 10))

    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      const progress = day / days
      const value = Math.round(startValue + (endValue - startValue) * progress)
      return { label: `${day} ${monthLabel}`, value }
    })
  }

  return DISTRICT_TEACHERS_TREND_BY_PERIOD[range.period]
}

function averageRate(points: Array<{ rate: number }>): number {
  if (!points.length) return DISTRICT_STATS.attendanceRate
  return Math.round(points.reduce((sum, p) => sum + p.rate, 0) / points.length)
}

function sumEnrollment(points: Array<{ newRegistrations: number; dropouts: number }>) {
  return points.reduce(
    (acc, p) => ({
      newRegistrations: acc.newRegistrations + p.newRegistrations,
      dropouts: acc.dropouts + p.dropouts,
    }),
    { newRegistrations: 0, dropouts: 0 },
  )
}

export function getDashboardStatsForRange(range: EffectiveDateRange): DashboardPeriodStats {
  if (range.isMonthDrillDown && range.monthKey) {
    if (!monthHasData(range.monthKey)) {
      return {
        ecdCenters: 0,
        totalChildren: 0,
        presentToday: 0,
        attendanceRate: 0,
        newRegistrations: 0,
        dropouts: 0,
      }
    }

    const enrollmentDaily = getDistrictEnrollmentTrendForRange(range)
    const attendanceDaily = getDistrictAttendanceTrendForRange(range)
    const schoolsPoint = findYearRow(DISTRICT_SCHOOLS_TREND_BY_PERIOD.year, range.monthKey)
    const enrollmentTotals = sumEnrollment(enrollmentDaily)
    const attendanceRate = averageRate(attendanceDaily)
    const totalChildren = ENROLLMENT_SUMMARY_BY_PERIOD.year.totalEnrolled
    const presentToday = Math.round((totalChildren * attendanceRate) / 100)

    return {
      ecdCenters: schoolsPoint?.value ?? DISTRICT_STATS.ecdCenters,
      totalChildren,
      presentToday,
      attendanceRate,
      newRegistrations: enrollmentTotals.newRegistrations,
      dropouts: enrollmentTotals.dropouts,
    }
  }

  const summary = ENROLLMENT_SUMMARY_BY_PERIOD[range.period]
  const attendancePoints = DISTRICT_ATTENDANCE_TREND_BY_PERIOD[range.period]
  const schoolsPoints = DISTRICT_SCHOOLS_TREND_BY_PERIOD[range.period]
  const attendanceRate =
    range.period === 'year'
      ? averageRate(attendancePoints)
      : attendancePoints.at(-1)?.rate ?? DISTRICT_STATS.attendanceRate

  const ecdCenters =
    range.period === 'year'
      ? (schoolsPoints.at(-1)?.value ?? DISTRICT_STATS.ecdCenters)
      : DISTRICT_STATS.ecdCenters

  const presentToday =
    range.period === 'today'
      ? DISTRICT_STATS.presentToday
      : Math.round((summary.totalEnrolled * attendanceRate) / 100)

  return {
    ecdCenters,
    totalChildren: summary.totalEnrolled,
    presentToday,
    attendanceRate,
    newRegistrations: summary.newRegistrations,
    dropouts: summary.dropouts,
  }
}

export function hasDashboardDataForRange(range: EffectiveDateRange): boolean {
  if (!range.isMonthDrillDown) return true
  return monthHasData(range.monthKey)
}
