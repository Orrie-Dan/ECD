import type { NotificationEntityType } from '@/models/notifications'

/**
 * Resolve a click-through path for a notification based on its entity.
 * The `rolePrefix` adapts paths to the current role's route namespace.
 */
export function getNotificationLink(
  entityType: NotificationEntityType | null,
  entityId: string | null,
  rolePrefix: string,
): string {
  if (!entityType || !entityId) return `${rolePrefix}/amatangazo`

  switch (entityType) {
    case 'child_transfer':
      return `${rolePrefix}/kwimura`
    case 'child':
      return `${rolePrefix}/abana/${entityId}`
    case 'child_nutrition_screening':
      return `${rolePrefix}/abana/${entityId}`
    case 'referral':
      return `${rolePrefix}/abana/${entityId}`
    case 'sted_assessment':
      return `${rolePrefix}/abana/${entityId}`
    case 'compliance_assessment':
      return `${rolePrefix}/isuzuma`
    case 'ecd_center':
      return `${rolePrefix}/ibigo/${entityId}`
    case 'user_account':
      return `${rolePrefix}/abakoresha/${entityId}`
    default:
      return `${rolePrefix}/amatangazo`
  }
}
