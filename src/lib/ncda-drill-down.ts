import type { FollowUpAlertCategory } from '@/models/alerts'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import type {
  OverviewAttentionItem,
  OverviewKpi,
} from '@/features/ncda/overview/types'
import type { NutritionAlertKindApi } from '@/models/nutrition'

export type NcdaChildrenListPreset = {
  status?: 'active' | 'archived'
  districtId?: string
  centerId?: string
}

/** Build a filtered national children directory URL. */
export function ncdaChildrenPath(preset: NcdaChildrenListPreset = {}): string {
  const params = new URLSearchParams()
  if (preset.status) params.set('status', preset.status)
  if (preset.districtId) params.set('district', preset.districtId)
  if (preset.centerId) params.set('centre', preset.centerId)
  const query = params.toString()
  return query ? `${NCDA_PATHS.children}?${query}` : NCDA_PATHS.children
}

/** Demographic drill-down for the dashboard children KPI. */
export function ncdaDemographicsPath(preset: {
  districtId?: string
  centerId?: string
} = {}): string {
  const params = new URLSearchParams()
  if (preset.districtId) params.set('district', preset.districtId)
  if (preset.centerId) params.set('centre', preset.centerId)
  const query = params.toString()
  return query ? `${NCDA_PATHS.demographics}?${query}` : NCDA_PATHS.demographics
}

/** Follow-up alerts roster, optionally filtered by category. */
export function ncdaFollowUpPath(category?: FollowUpAlertCategory): string {
  if (!category) return NCDA_PATHS.followUp
  return `${NCDA_PATHS.followUp}?category=${category}`
}

export type NcdaNutritionAlertsPreset = {
  districtId?: string
  centerId?: string
  status?: NutritionAlertKindApi | 'all'
}

/** National nutrition alert roster — redirects conceptually to follow-up nutrition category. */
export function ncdaNutritionAlertsPath(preset: NcdaNutritionAlertsPreset = {}): string {
  const params = new URLSearchParams()
  params.set('category', 'nutrition')
  if (preset.districtId) params.set('district', preset.districtId)
  if (preset.centerId) params.set('centre', preset.centerId)
  if (preset.status && preset.status !== 'all') params.set('status', preset.status)
  const query = params.toString()
  return `${NCDA_PATHS.followUp}?${query}`
}

export function kpiDrillDownHref(kpi: OverviewKpi): string | undefined {
  if (kpi.status === 'unavailable') return undefined
  switch (kpi.key) {
    case 'children':
      return ncdaDemographicsPath()
    case 'activeCenters':
      return NCDA_PATHS.centers
    case 'attendance':
      return ncdaFollowUpPath('attendance')
    case 'compliantCenters':
      return NCDA_PATHS.inspections
    default:
      return undefined
  }
}

export function attentionDrillDownHref(item: OverviewAttentionItem): string {
  switch (item.key) {
    case 'nutrition':
      return ncdaNutritionAlertsPath({ status: 'severe_nutrition' })
    case 'nonCompliant':
      return NCDA_PATHS.inspections
    case 'inactiveDistricts':
      return NCDA_PATHS.districts
    default:
      return item.href
  }
}

