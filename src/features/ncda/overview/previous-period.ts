import type { EffectiveDateRange } from '@/lib/chart-period'
import {
  dayToMonitoringRange,
  yearMonthToMonitoringRange,
} from '@/features/monitoring'
import type { MonitoringDateFilters } from '@/models/monitoring'

function isoDateUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Inclusive UTC bounds for the period immediately before `range`.
 * Used only for live like-for-like comparison (not a fabricated time series).
 */
export function previousMonitoringDates(
  range: EffectiveDateRange,
  now = new Date(),
): Pick<MonitoringDateFilters, 'from' | 'to'> {
  if (range.period === 'today') {
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    return dayToMonitoringRange(isoDateUTC(yesterday))
  }

  if (range.period === 'week') {
    const end = new Date(now)
    end.setUTCDate(end.getUTCDate() - 7)
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - 6)
    return {
      from: `${isoDateUTC(start)}T00:00:00.000Z`,
      to: `${isoDateUTC(end)}T23:59:59.999Z`,
    }
  }

  if (range.period === 'month') {
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const ym = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`
    return yearMonthToMonitoringRange(ym)
  }

  if (range.isMonthDrillDown && range.monthKey) {
    const monthNum = Number(range.monthKey)
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1
    const prevYear = monthNum === 1 ? range.year - 1 : range.year
    return yearMonthToMonitoringRange(`${prevYear}-${String(prevMonth).padStart(2, '0')}`)
  }

  return {
    from: `${range.year - 1}-01-01T00:00:00.000Z`,
    to: `${range.year - 1}-12-31T23:59:59.999Z`,
  }
}

/** Numeric direction of the delta (not “improved”). Colour is applied in the UI. */
export function trendDirectionFromDelta(
  delta: number | undefined,
): 'up' | 'down' | 'flat' | undefined {
  if (delta == null || Number.isNaN(delta)) return undefined
  if (Math.abs(delta) < 0.05) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/** Relative change for counts. Undefined when previous is 0 and current is not. */
export function relativeChange(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined
  if (previous === 0) return current === 0 ? 0 : undefined
  return ((current - previous) / Math.abs(previous)) * 100
}

/** Delta in the same unit as the two values (percentage points when rates are 0–100). */
export function percentagePointChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | undefined {
  if (current == null || previous == null) return undefined
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined
  return current - previous
}
