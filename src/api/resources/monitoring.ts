/**
 * Monitoring + analytics dashboard resource layer.
 * Feature hooks import from here; UI never imports monitoring DTOs.
 */
import { analyticsControllerGetDashboard } from '@/api/generated/endpoints/analytics/analytics'
import {
  monitoringControllerAttendance,
  monitoringControllerFeeding,
  monitoringControllerNutrition,
  monitoringControllerReferrals,
  monitoringControllerSted,
} from '@/api/generated/endpoints/monitoring/monitoring'
import {
  mapAttendanceMonitoringToViewModel,
  mapDashboardDtoToViewModel,
  mapFeedingMonitoringToViewModel,
  mapNutritionMonitoringToViewModel,
  mapReferralsMonitoringToViewModel,
  mapStedMonitoringToViewModel,
  toMonitoringQueryParams,
} from '@/api/mappers/monitoring.mapper'
import type {
  MonitoringAttendanceViewModel,
  MonitoringDashboardViewModel,
  MonitoringDateFilters,
  MonitoringFeedingViewModel,
  MonitoringNutritionViewModel,
  MonitoringReferralsViewModel,
  MonitoringScopeFilters,
  MonitoringStedViewModel,
} from '@/models/monitoring'

export async function fetchMonitoringDashboard(
  filters: MonitoringDateFilters = {},
): Promise<MonitoringDashboardViewModel> {
  const dto = await analyticsControllerGetDashboard({
    from: filters.from,
    to: filters.to,
    districtId: filters.districtId,
    centerId: filters.centerId,
  })
  return mapDashboardDtoToViewModel(dto)
}

export async function fetchMonitoringAttendance(
  filters: MonitoringScopeFilters = {},
): Promise<MonitoringAttendanceViewModel> {
  const dto = await monitoringControllerAttendance(toMonitoringQueryParams(filters))
  return mapAttendanceMonitoringToViewModel(dto)
}

export async function fetchMonitoringNutrition(
  filters: MonitoringScopeFilters = {},
): Promise<MonitoringNutritionViewModel> {
  const dto = await monitoringControllerNutrition(toMonitoringQueryParams(filters))
  return mapNutritionMonitoringToViewModel(dto)
}

export async function fetchMonitoringFeeding(
  filters: MonitoringScopeFilters = {},
): Promise<MonitoringFeedingViewModel> {
  const dto = await monitoringControllerFeeding(toMonitoringQueryParams(filters))
  return mapFeedingMonitoringToViewModel(dto)
}

export async function fetchMonitoringSted(
  filters: MonitoringScopeFilters = {},
): Promise<MonitoringStedViewModel> {
  const dto = await monitoringControllerSted(toMonitoringQueryParams(filters))
  return mapStedMonitoringToViewModel(dto)
}

export async function fetchMonitoringReferrals(
  filters: MonitoringScopeFilters = {},
): Promise<MonitoringReferralsViewModel> {
  const dto = await monitoringControllerReferrals(toMonitoringQueryParams(filters))
  return mapReferralsMonitoringToViewModel(dto)
}
