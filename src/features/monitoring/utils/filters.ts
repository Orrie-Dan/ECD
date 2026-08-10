import type { MonitoringDateFilters, MonitoringScopeFilters } from '@/models/monitoring'
import type { EffectiveDateRange } from '@/lib/chart-period'

/** Calendar date (YYYY-MM-DD) → inclusive UTC day bounds for monitoring APIs. */
export function dayToMonitoringRange(date: string): Pick<MonitoringDateFilters, 'from' | 'to'> {
  return {
    from: `${date}T00:00:00.000Z`,
    to: `${date}T23:59:59.999Z`,
  }
}

/** Year-month (YYYY-MM) → inclusive UTC month bounds. */
export function yearMonthToMonitoringRange(
  yearMonth: string,
): Pick<MonitoringDateFilters, 'from' | 'to'> {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dd = String(lastDay).padStart(2, '0')
  return {
    from: `${yearMonth}-01T00:00:00.000Z`,
    to: `${yearMonth}-${dd}T23:59:59.999Z`,
  }
}

/** ISO date or date-time range from chart period resolution. */
export function rangeToMonitoringFilters(
  startDate: string,
  endDate: string,
  extras: Omit<MonitoringScopeFilters, 'from' | 'to'> = {},
): MonitoringScopeFilters {
  const from = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
  const to = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
  return { ...extras, from, to, page: extras.page ?? 1, pageSize: extras.pageSize ?? 100 }
}

function isoDateUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Map district dashboard chart period → monitoring/analytics from/to.
 * Uses real UTC "today" for today/week/month; chart year for year views.
 */
export function effectiveRangeToMonitoringDates(
  range: EffectiveDateRange,
  now = new Date(),
): Pick<MonitoringDateFilters, 'from' | 'to'> {
  const today = isoDateUTC(now)
  if (range.period === 'today') {
    return dayToMonitoringRange(today)
  }
  if (range.period === 'week') {
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() - 6)
    return {
      from: `${isoDateUTC(start)}T00:00:00.000Z`,
      to: `${today}T23:59:59.999Z`,
    }
  }
  if (range.period === 'month') {
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    return yearMonthToMonitoringRange(ym)
  }
  if (range.isMonthDrillDown && range.monthKey) {
    return yearMonthToMonitoringRange(`${range.year}-${range.monthKey}`)
  }
  return {
    from: `${range.year}-01-01T00:00:00.000Z`,
    to: `${range.year}-12-31T23:59:59.999Z`,
  }
}

export function roundPct(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.round(value)
}
