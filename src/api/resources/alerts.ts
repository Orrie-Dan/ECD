/**
 * Follow-up alerts resource — wraps generated OpenAPI client.
 * Impugukirwa LIVE reads only (GET). No dismiss/ack mutations in contract.
 */
import { alertsControllerGetFollowUp } from '@/api/generated/endpoints/alerts/alerts'
import type {
  AlertsControllerGetFollowUpParams,
  FollowUpCategory,
} from '@/api/generated/models'
import type { FollowUpAlertsViewModel } from '@/models/alerts'

export type FollowUpAlertsFilters = Omit<AlertsControllerGetFollowUpParams, 'category'> & {
  /** UI may include categories not yet in the OpenAPI FollowUpCategory enum. */
  category?: string
}

const API_FOLLOW_UP_CATEGORIES = new Set<string>([
  'nutrition',
  'attendance',
  'referral',
  'data_quality',
])

/** Map UI category filters onto the OpenAPI FollowUpCategory enum. */
export function toFollowUpApiCategory(
  category: string | undefined,
): FollowUpCategory | undefined {
  if (!category || category === 'all') return undefined
  if (API_FOLLOW_UP_CATEGORIES.has(category)) return category as FollowUpCategory
  return undefined
}

export async function fetchFollowUpAlerts(
  filters: FollowUpAlertsFilters = {},
): Promise<FollowUpAlertsViewModel> {
  const dto = await alertsControllerGetFollowUp({
    districtId: filters.districtId,
    centerId: filters.centerId,
    category: toFollowUpApiCategory(filters.category),
    limit: filters.limit ?? 100,
  })

  return {
    items: dto.items.map((item) => ({
      id: item.id,
      category: item.category,
      priority: item.priority,
      code: item.code,
      title: item.title,
      description: item.description,
      centerId: item.centerId,
      centerName: item.centerName,
      childId: item.childId,
      childName: item.childName,
      entityType: item.entityType,
      entityId: item.entityId,
      detectedAt: item.detectedAt,
      metrics: item.metrics.map((m) => ({ label: m.label, value: m.value })),
    })),
    total: dto.total,
    counts: {
      nutrition: dto.counts.nutrition,
      attendance: dto.counts.attendance,
      referral: dto.counts.referral,
      data_quality: dto.counts.data_quality,
      // Not yet in FollowUpAlertCountsDto contract — keep view-model shape stable.
      sted: 0,
      transfer: 0,
      compliance: 0,
      capacity: 0,
      high: dto.counts.high,
    },
    districtId: dto.districtId,
    centerId: dto.centerId,
  }
}
