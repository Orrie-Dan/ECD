import type { ReportingScopeFilters } from '@/models/reporting'

/** Calendar date range → monitoring/reporting from/to. */
export function datesToReportingRange(
  dateFrom: string,
  dateTo: string,
): Pick<ReportingScopeFilters, 'from' | 'to'> {
  return {
    from: `${dateFrom}T00:00:00.000Z`,
    to: `${dateTo}T23:59:59.999Z`,
  }
}

export function roundPct(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.round(value)
}
