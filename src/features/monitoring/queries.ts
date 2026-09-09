import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { monitoring, queryStaleTimes } from '@/api/query-keys'
import {
  fetchMonitoringAttendance,
  fetchMonitoringCompliance,
  fetchMonitoringDashboard,
  fetchMonitoringFeeding,
  fetchMonitoringNutrition,
  fetchMonitoringReferrals,
  fetchMonitoringSted,
} from '@/api/resources/monitoring'
import type {
  MonitoringDateFilters,
  MonitoringScopeFilters,
} from '@/models/monitoring'

export function useMonitoringDashboard(filters: MonitoringDateFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.dashboard(filters),
    queryFn: () => fetchMonitoringDashboard(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDashboard,
  })
}

export function useMonitoringAttendance(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.attendance(filters),
    queryFn: () => fetchMonitoringAttendance(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}

export function useMonitoringNutrition(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.nutrition(filters),
    queryFn: () => fetchMonitoringNutrition(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}

export function useMonitoringFeeding(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.feeding(filters),
    queryFn: () => fetchMonitoringFeeding(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}

export function useMonitoringSted(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.sted(filters),
    queryFn: () => fetchMonitoringSted(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}

export function useMonitoringReferrals(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.referrals(filters),
    queryFn: () => fetchMonitoringReferrals(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}

export function useMonitoringCompliance(filters: MonitoringScopeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: monitoring.keys.compliance(filters),
    queryFn: () => fetchMonitoringCompliance(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.monitoringDomain,
  })
}
