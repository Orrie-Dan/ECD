import type { EnrollmentPeriod } from '@/types'
import { district } from '@/locales/rw/district'

export const CURRENT_CHART_YEAR = 2026

export type ChartGranularity = 'hour' | 'day' | 'week' | 'month'

export interface EffectiveDateRange {
  period: EnrollmentPeriod
  monthKey: string
  year: number
  monthLabel?: string
  /** Human-readable label for filter chips, e.g. "Werurwe 2026" */
  timeLabel: string
  isMonthDrillDown: boolean
  granularity: ChartGranularity
  hasData: boolean
}

export const CHART_PERIOD_OPTIONS: { value: EnrollmentPeriod; label: string }[] = [
  { value: 'today', label: district.schools.periodToday },
  { value: 'week', label: district.schools.periodWeek },
  { value: 'month', label: district.schools.periodMonth },
  { value: 'year', label: district.schools.periodYear },
]

/** Rwandan month labels keyed by MM (01–12). */
export const RWANDA_MONTH_LABELS: Record<string, string> = {
  '01': 'Mutarama',
  '02': 'Gashyantare',
  '03': 'Werurwe',
  '04': 'Mata',
  '05': 'Gicurasi',
  '06': 'Kamena',
  '07': 'Nyakanga',
  '08': 'Kanama',
  '09': 'Nzeri',
  '10': 'Ukwakira',
  '11': 'Ugushyingo',
  '12': 'Ukuboza',
}

export const CHART_MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: district.schools.allMonths },
  ...Object.entries(RWANDA_MONTH_LABELS).map(([value, label]) => ({ value, label })),
]

/** Filter year-view chart rows by selected month (Ukwezi). */
export function filterByMonthLabel<T extends { label: string }>(rows: T[], month: string): T[] {
  if (!month) return rows
  const monthLabel = RWANDA_MONTH_LABELS[month]
  if (!monthLabel) return rows
  return rows.filter((row) => row.label === monthLabel || row.label.startsWith(monthLabel.slice(0, 3)))
}

const PERIOD_TIME_LABELS: Record<EnrollmentPeriod, string> = {
  today: district.schools.periodToday,
  week: district.schools.periodWeek,
  month: district.schools.periodMonth,
  year: district.schools.periodYear,
}

function monthHasYearData(monthKey: string): boolean {
  if (!monthKey) return true
  const monthLabel = RWANDA_MONTH_LABELS[monthKey]
  if (!monthLabel) return false
  return true
}

/** Derive a single effective date range from period + optional month filter. */
export function resolveEffectiveDateRange(filter: {
  period: EnrollmentPeriod
  month: string
}): EffectiveDateRange {
  const { period, month: monthKey } = filter
  const year = CURRENT_CHART_YEAR
  const isMonthDrillDown = period === 'year' && Boolean(monthKey)
  const monthLabel = monthKey ? RWANDA_MONTH_LABELS[monthKey] : undefined

  let timeLabel: string
  let granularity: ChartGranularity

  if (isMonthDrillDown && monthLabel) {
    timeLabel = `${monthLabel} ${year}`
    granularity = 'day'
  } else if (period === 'year') {
    timeLabel = district.charts.yearOverviewLabel.replace('{year}', String(year))
    granularity = 'month'
  } else if (period === 'today') {
    timeLabel = PERIOD_TIME_LABELS.today
    granularity = 'hour'
  } else if (period === 'week') {
    timeLabel = PERIOD_TIME_LABELS.week
    granularity = 'day'
  } else {
    timeLabel = PERIOD_TIME_LABELS.month
    granularity = 'week'
  }

  return {
    period,
    monthKey,
    year,
    monthLabel,
    timeLabel,
    isMonthDrillDown,
    granularity,
    hasData: !isMonthDrillDown || monthHasYearData(monthKey),
  }
}

/** Build a dynamic chart title suffix from the active filter. */
export function formatDashboardChartTitle(baseTitle: string, range: EffectiveDateRange): string {
  if (range.isMonthDrillDown && range.monthLabel) {
    return `${baseTitle} – ${range.monthLabel} ${range.year}`
  }
  if (range.period === 'year' && !range.monthKey) {
    return `${baseTitle} – ${district.charts.yearOverviewLabel.replace('{year}', String(range.year))}`
  }
  return `${baseTitle} – ${range.timeLabel}`
}
