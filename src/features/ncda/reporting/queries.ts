/**
 * NCDA Reporting — JSON report contracts only.
 * Centers report uses DB pagination at national scope (Sprint 5.5I).
 * Export PDF/CSV endpoints do not exist. Excel is generated client-side
 * from the JSON report already loaded on this page.
 */
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  fetchCentersReport,
  fetchDistrictReport,
  fetchDropoutsReport,
  fetchEnrollmentReport,
} from '@/api/resources/reporting'
import type { ReportingScopeFilters } from '@/models/reporting'
import { listDistrictsPage } from '@/api/resources/geo'

export type NcdaReportingFilters = ReportingScopeFilters

export function useNcdaDistrictReport(
  filters: NcdaReportingFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.reporting.district(filters as Record<string, unknown>),
    queryFn: () => fetchDistrictReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaReporting,
  })
}

export function useNcdaEnrollmentReport(
  filters: NcdaReportingFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.reporting.enrollment(filters as Record<string, unknown>),
    queryFn: () => fetchEnrollmentReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaReporting,
  })
}

export function useNcdaDropoutsReport(
  filters: NcdaReportingFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.reporting.dropouts(filters as Record<string, unknown>),
    queryFn: () => fetchDropoutsReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaReporting,
  })
}

/**
 * Centers performance table — DB-paginated at national scope (Sprint 5.5I).
 */
export function useNcdaCentersReport(
  filters: NcdaReportingFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.reporting.centers(filters as Record<string, unknown>),
    queryFn: () => fetchCentersReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaReporting,
  })
}

export function useNcdaReportingDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.reporting.district({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaReporting,
  })
}

export const NCDA_REPORTING_UNAVAILABLE = [
  {
    id: 'export-pdf',
    reason: 'BACKEND CONTRACT GAP — no PDF/CSV export endpoints. Excel is generated client-side from the loaded report.',
  },
  {
    id: 'enrollment-trend-national',
    reason: 'Enrollment trend soft-capped (take 10000); incomplete nationally',
  },
  {
    id: 'compliance-wash-reports',
    reason: 'No /reports/* compliance or WASH contracts',
  },
] as const
