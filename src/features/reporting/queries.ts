import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { reporting, queryStaleTimes } from '@/api/query-keys'
import {
  fetchCentersReport,
  fetchDistrictReport,
  fetchDropoutsReport,
  fetchEnrollmentReport,
} from '@/api/resources/reporting'
import type { ReportingScopeFilters } from '@/models/reporting'

export function useEnrollmentReport(filters: ReportingScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reporting.keys.enrollment(filters),
    queryFn: () => fetchEnrollmentReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.reporting,
  })
}

export function useDropoutsReport(filters: ReportingScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reporting.keys.dropouts(filters),
    queryFn: () => fetchDropoutsReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.reporting,
  })
}

export function useCentersReport(filters: ReportingScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reporting.keys.centers(filters),
    queryFn: () => fetchCentersReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.reporting,
  })
}

export function useDistrictReport(filters: ReportingScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: reporting.keys.district(filters),
    queryFn: () => fetchDistrictReport(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.reporting,
  })
}
