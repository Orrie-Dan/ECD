/**
 * Reporting resource layer — wraps generated /reports/* clients + mappers.
 * Attendance/nutrition aggregates are consumed via the monitoring resource (canonical).
 */
import {
  reportsControllerCenters,
  reportsControllerDistrict,
  reportsControllerDropouts,
  reportsControllerEnrollment,
} from '@/api/generated/endpoints/reports/reports'
import {
  mapCentersReportToViewModel,
  mapDistrictReportToViewModel,
  mapDropoutsReportToViewModel,
  mapEnrollmentReportToViewModel,
  toReportingQueryParams,
} from '@/api/mappers/reporting.mapper'
import type {
  CentersReportViewModel,
  DistrictReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
  ReportingScopeFilters,
} from '@/models/reporting'

export async function fetchEnrollmentReport(
  filters: ReportingScopeFilters = {},
): Promise<EnrollmentReportViewModel> {
  const dto = await reportsControllerEnrollment(toReportingQueryParams(filters))
  return mapEnrollmentReportToViewModel(dto)
}

export async function fetchDropoutsReport(
  filters: ReportingScopeFilters = {},
): Promise<DropoutsReportViewModel> {
  const dto = await reportsControllerDropouts(toReportingQueryParams(filters))
  return mapDropoutsReportToViewModel(dto)
}

export async function fetchCentersReport(
  filters: ReportingScopeFilters = {},
): Promise<CentersReportViewModel> {
  const dto = await reportsControllerCenters(toReportingQueryParams(filters))
  return mapCentersReportToViewModel(dto)
}

export async function fetchDistrictReport(
  filters: ReportingScopeFilters = {},
): Promise<DistrictReportViewModel> {
  const dto = await reportsControllerDistrict(toReportingQueryParams(filters))
  return mapDistrictReportToViewModel(dto)
}
