import { useMemo } from 'react'
import type { EffectiveDateRange } from '@/lib/chart-period'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import {
  useNcdaDashboardKpis,
  useNcdaDashboardNetwork,
  useNcdaDashboardOverview,
} from './queries'

/**
 * Composes independent national aggregate queries for the NCDA dashboard.
 * Partial failure is intentional: each section exposes its own error/retry.
 */
export function useNcdaDashboard(range: EffectiveDateRange) {
  const dateFilters = useMemo(
    () => effectiveRangeToMonitoringDates(range),
    [range],
  )

  const overview = useNcdaDashboardOverview(dateFilters)
  const kpis = useNcdaDashboardKpis(dateFilters)
  const network = useNcdaDashboardNetwork()

  return {
    dateFilters,
    overview,
    kpis,
    network,
    /** True only while LIVE queries that have not yet resolved are pending. */
    isBootstrapping:
      (overview.isLoading && !overview.data) ||
      (kpis.isLoading && !kpis.data) ||
      (network.isLoading && !network.data),
  }
}
