/**
 * Follow-up alerts resource — wraps generated OpenAPI client.
 * District Gukurikirana LIVE reads only (GET). No dismiss/ack mutations in contract.
 */
import { alertsControllerGetFollowUp } from '@/api/generated/endpoints/alerts/alerts'
import type { AlertsControllerGetFollowUpParams } from '@/api/generated/models'
import type { FollowUpAlertsViewModel } from '@/models/alerts'

export type FollowUpAlertsFilters = AlertsControllerGetFollowUpParams

export async function fetchFollowUpAlerts(
  filters: FollowUpAlertsFilters = {},
): Promise<FollowUpAlertsViewModel> {
  const dto = await alertsControllerGetFollowUp({
    districtId: filters.districtId,
    centerId: filters.centerId,
    category: filters.category,
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
      high: dto.counts.high,
    },
    districtId: dto.districtId,
    centerId: dto.centerId,
  }
}
