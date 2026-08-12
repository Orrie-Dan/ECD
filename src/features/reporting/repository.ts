import { useMemo } from 'react'
import { env } from '@/config/env'
import { useMonitoringAttendance, useMonitoringNutrition } from '@/features/monitoring'
import {
  useCentersReport,
  useDistrictReport,
  useDropoutsReport,
  useEnrollmentReport,
} from '@/features/reporting/queries'
import { datesToReportingRange } from '@/features/reporting/utils/filters'
import {
  buildMockAttendanceReportRows,
  buildMockCentersReport,
  buildMockDistrictReport,
  buildMockDropoutsReport,
  buildMockEnrollmentReport,
  mapMonitoringAttendanceToReportRows,
} from '@/features/reporting/utils/mock-bridge'
import type {
  AttendanceReportCenterRowViewModel,
  AttendanceReportSummaryViewModel,
  CentersReportViewModel,
  DistrictReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
  ReportPreviewKind,
} from '@/models/reporting'

/**
 * Mode-aware reporting reads for district ReportsPage.
 * LIVE attendance/nutrition KPIs come from monitoring (canonical).
 * LIVE enrollment/dropouts/centers/district come from /reports/*.
 */

export function useDistrictAttendanceReport(input: {
  dateFrom: string
  dateTo: string
  sector: string
  search: string
}) {
  const filters = useMemo(() => {
    const range = datesToReportingRange(input.dateFrom, input.dateTo)
    return {
      ...range,
      page: 1,
      pageSize: 100,
    }
  }, [input.dateFrom, input.dateTo])

  const live = useMonitoringAttendance(filters)

  const mock = useMemo(
    () =>
      buildMockAttendanceReportRows(
        input.dateFrom,
        input.dateTo,
        input.sector,
        input.search,
      ),
    [input.dateFrom, input.dateTo, input.sector, input.search],
  )

  const mapped = useMemo(() => {
    if (!env.isLive || !live.data) return null
    let { rows, summary } = mapMonitoringAttendanceToReportRows(live.data)
    const q = input.search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => r.centerName.toLowerCase().includes(q))
    }
    // sector filter not supported by attendance monitoring items — document gap
    return { rows, summary }
  }, [input.search, live.data])

  return {
    rows: (env.isLive ? mapped?.rows : mock.rows) as AttendanceReportCenterRowViewModel[],
    summary: (env.isLive ? mapped?.summary : mock.summary) as AttendanceReportSummaryViewModel,
    isLoading: env.isLive && live.isLoading,
    isError: env.isLive && live.isError,
    refetch: env.isLive ? live.refetch : undefined,
    source: env.isLive ? ('api' as const) : ('mock' as const),
  }
}

export function useReportPreviewData(input: {
  kind: ReportPreviewKind | null
  dateFrom: string
  dateTo: string
}) {
  const filters = useMemo(() => {
    const range = datesToReportingRange(input.dateFrom, input.dateTo)
    return { ...range, page: 1, pageSize: 100 }
  }, [input.dateFrom, input.dateTo])

  const kind = input.kind
  const enableEnrollment = kind === 'enrollment'
  const enableDropouts = kind === 'dropouts'
  const enableCenters = kind === 'centers'
  const enableDistrict = kind === 'enrollment' || kind === 'dropouts' || kind === 'centers'
  const enableNutrition =
    kind === 'nutritionCoverage' ||
    kind === 'nutritionStatus' ||
    kind === 'nutritionCenters' ||
    kind === 'nutritionTrends'

  const enrollmentQ = useEnrollmentReport(filters, enableEnrollment)
  const dropoutsQ = useDropoutsReport(filters, enableDropouts)
  const centersQ = useCentersReport(filters, enableCenters)
  const districtQ = useDistrictReport(filters, enableDistrict)
  const nutritionQ = useMonitoringNutrition(filters, enableNutrition)

  const mockEnrollment = useMemo(
    () => buildMockEnrollmentReport(input.dateFrom, input.dateTo),
    [input.dateFrom, input.dateTo],
  )
  const mockDropouts = useMemo(
    () => buildMockDropoutsReport(input.dateFrom, input.dateTo),
    [input.dateFrom, input.dateTo],
  )
  const mockCenters = useMemo(
    () => buildMockCentersReport(input.dateFrom, input.dateTo),
    [input.dateFrom, input.dateTo],
  )
  const mockDistrict = useMemo(
    () => buildMockDistrictReport(input.dateFrom, input.dateTo),
    [input.dateFrom, input.dateTo],
  )

  return {
    enrollment: (env.isLive ? enrollmentQ.data : mockEnrollment) as
      | EnrollmentReportViewModel
      | undefined,
    dropouts: (env.isLive ? dropoutsQ.data : mockDropouts) as DropoutsReportViewModel | undefined,
    centers: (env.isLive ? centersQ.data : mockCenters) as CentersReportViewModel | undefined,
    district: (env.isLive ? districtQ.data : mockDistrict) as DistrictReportViewModel | undefined,
    nutrition: nutritionQ.data,
    isLoading:
      (enableEnrollment && env.isLive && enrollmentQ.isLoading) ||
      (enableDropouts && env.isLive && dropoutsQ.isLoading) ||
      (enableCenters && env.isLive && centersQ.isLoading) ||
      (enableDistrict && env.isLive && districtQ.isLoading) ||
      (enableNutrition && env.isLive && nutritionQ.isLoading),
    source: env.isLive ? ('api' as const) : ('mock' as const),
    /** sectors has no backend report/monitoring endpoint */
    sectorsUnsupported: true,
  }
}

export function useReportingRepository() {
  return {
    useDistrictAttendanceReport,
    useReportPreviewData,
  }
}
