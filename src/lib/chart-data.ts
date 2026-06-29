import type { EnrollmentTrendPoint } from '@/types'
import type { AttendanceTrendPoint } from '@/lib/mock-data'
import { formatDate } from '@/lib/mock-data'

export interface EnrollmentChartRow extends Record<string, string | number> {
  label: string
  newRegistrations: number
  dropouts: number
}

export interface AttendanceChartRow extends Record<string, string | number> {
  label: string
  tooltipLabel: string
  attendance: number
}

export interface SingleSeriesChartRow extends Record<string, string | number> {
  label: string
  value: number
}

export function toEnrollmentChartData(points: EnrollmentTrendPoint[]): EnrollmentChartRow[] {
  return points.map((p) => ({
    label: p.label,
    newRegistrations: p.newRegistrations,
    dropouts: p.dropouts,
  }))
}

export function toCenterEnrollmentChartData(
  history: Array<{ month: string; registered: number; dropouts: number }>,
): EnrollmentChartRow[] {
  return history.map((h) => ({
    label: h.month,
    newRegistrations: h.registered,
    dropouts: h.dropouts,
  }))
}

export function toAttendanceChartData(points: AttendanceTrendPoint[]): AttendanceChartRow[] {
  return points.map((p) => {
    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(p.date)
    return {
      label: isIso ? formatShortDate(p.date) : p.date,
      tooltipLabel: isIso ? formatDate(p.date) : p.date,
      attendance: p.rate,
    }
  })
}

export function toDistrictAttendanceChartData(
  points: Array<{ label: string; rate: number }>,
): AttendanceChartRow[] {
  return points.map((p) => ({
    label: p.label,
    tooltipLabel: p.label,
    attendance: p.rate,
  }))
}

export function toSingleSeriesChartData(
  items: Array<{ label: string; value: number }>,
): SingleSeriesChartRow[] {
  return items.map((item) => ({ label: item.label, value: item.value }))
}

function formatShortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso
  const dd = iso.slice(8, 10)
  const mm = iso.slice(5, 7)
  return `${dd}/${mm}`
}
