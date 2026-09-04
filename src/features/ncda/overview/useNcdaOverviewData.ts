import { useMemo } from 'react'
import type { EffectiveDateRange } from '@/lib/chart-period'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import { useNcdaDashboard } from '@/features/ncda/dashboard/useNcdaDashboard'
import { useNcdaDashboardOverview } from '@/features/ncda/dashboard/queries'
import { useNcdaMonitoringCompliance, useNcdaMonitoringSted } from '@/features/ncda/monitoring/queries'
import { useNcdaOverviewDistricts } from '@/features/ncda/overview/queries'
import { ComplianceClassification } from '@/api/generated/models'
import {
  buildAttentionItems,
  buildDistrictRisks,
  buildNationalKpis,
  selectPriorityDistricts,
} from './build-overview-view'
import { classificationCount } from './performance-band'
import { previousMonitoringDates } from './previous-period'
import type { NcdaMapMetricId } from './types'

/**
 * National command-centre view-model. Does not fan out per-center reads.
 * Previous-period overview is a second analytics/dashboard call for live comparison only.
 */
export function useNcdaOverviewData(range: EffectiveDateRange, metric: NcdaMapMetricId) {
  const dateFilters = useMemo(() => effectiveRangeToMonitoringDates(range), [range])
  const previousDates = useMemo(() => previousMonitoringDates(range), [range])

  const dashboard = useNcdaDashboard(range)
  const previousOverview = useNcdaDashboardOverview(previousDates)
  const districtsQuery = useNcdaOverviewDistricts()
  const sted = useNcdaMonitoringSted(
    { ...dateFilters, page: 1, pageSize: 100 },
    true,
  )
  const compliance = useNcdaMonitoringCompliance(dateFilters)

  const districts = useMemo(() => districtsQuery.data?.items ?? [], [districtsQuery.data])
  const overview = dashboard.overview.data
  const network = dashboard.network.data
  const previous = previousOverview.data

  const kpis = useMemo(
    () =>
      buildNationalKpis({
        childrenActive: overview?.children.active,
        childrenPresent: Boolean(overview),
        activeCenters: network?.activeCenters,
        activeCentersPresent: Boolean(network),
        attendanceRate: overview?.attendance.rate,
        attendancePresent: Boolean(overview),
        previousAttendanceRate: previous?.attendance.rate,
        compliance: compliance.data?.summary,
        compliancePresent: Boolean(compliance.data),
      }),
    [overview, network, previous?.attendance.rate, compliance.data],
  )

  const attention = useMemo(
    () =>
      buildAttentionItems({
        nonCompliant: classificationCount(
          compliance.data?.summary.byClassification,
          ComplianceClassification.non_compliant,
        ),
        nonCompliantPresent: (compliance.data?.summary.classificationPopulated ?? 0) > 0,
        nutritionSevere: overview?.nutrition.severe,
        nutritionPresent: Boolean(overview),
        inactiveDistricts: districtsQuery.data ? districts.filter((d) => !d.isActive).length : undefined,
        inactivePresent: Boolean(districtsQuery.data),
      }),
    [compliance.data, overview, districts, districtsQuery.data],
  )

  const districtRisks = useMemo(
    () => buildDistrictRisks(districts, sted.data),
    [districts, sted.data],
  )

  const priorityDistricts = useMemo(
    () => selectPriorityDistricts(districtRisks, metric),
    [districtRisks, metric],
  )

  return {
    dateFilters,
    dashboard,
    previousOverview,
    districtsQuery,
    sted,
    compliance,
    districts,
    kpis,
    attention,
    districtRisks,
    priorityDistricts,
    isBootstrapping:
      dashboard.isBootstrapping ||
      (compliance.isLoading && !compliance.data) ||
      (districtsQuery.isLoading && !districtsQuery.data),
  }
}
