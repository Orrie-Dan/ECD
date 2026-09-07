/**
 * Follow-up alert hierarchy summary — Impugukirwa drill-down.
 * Manual resource (not yet in Orval); mirrors GET /api/v1/alerts/follow-up/summary.
 */
import { customInstance } from '@/api/client'

export type FollowUpSummaryGroupBy = 'province' | 'district' | 'sector' | 'center'

export type FollowUpSummaryFilters = {
  groupBy: FollowUpSummaryGroupBy
  provinceId?: string
  districtId?: string
  sectorId?: string
  centerId?: string
  category?: string
  priority?: 'all' | 'high' | 'medium' | 'low'
}

export type FollowUpSummaryNode = {
  id: string
  name: string
  level: FollowUpSummaryGroupBy
  total: number
  priorityCounts: { high: number; medium: number; low: number }
  categoryCounts: {
    nutrition: number
    attendance: number
    referral: number
    data_quality: number
    sted: number
    transfer: number
    compliance: number
    capacity: number
  }
  provinceId: string | null
  districtId: string | null
  sectorId: string | null
  centerId: string | null
}

export type FollowUpSummaryViewModel = {
  groupBy: FollowUpSummaryGroupBy
  scope: {
    provinceId: string | null
    districtId: string | null
    sectorId: string | null
    centerId: string | null
  }
  items: FollowUpSummaryNode[]
  totalAlerts: number
  highPriority: number
  generatedAt: string
}

export async function fetchFollowUpSummary(
  filters: FollowUpSummaryFilters,
): Promise<FollowUpSummaryViewModel> {
  const params: Record<string, string> = { groupBy: filters.groupBy }
  if (filters.provinceId) params.provinceId = filters.provinceId
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.sectorId) params.sectorId = filters.sectorId
  if (filters.centerId) params.centerId = filters.centerId
  if (filters.category && filters.category !== 'all') params.category = filters.category
  if (filters.priority && filters.priority !== 'all') params.priority = filters.priority

  return customInstance<FollowUpSummaryViewModel>({
    url: '/api/v1/alerts/follow-up/summary',
    method: 'GET',
    params,
  })
}
