import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import type { NotificationEntityType, NotificationType } from '@/models/notifications'

export interface NotificationLinkInput {
  type: NotificationType
  entityType: NotificationEntityType | null
  entityId: string | null
  rolePrefix: string
}

function normalizePrefix(rolePrefix: string): string {
  return rolePrefix.replace(/\/$/, '') || '/caretaker'
}

/**
 * Resolve a click-through path for a notification based on its type and entity.
 * The `rolePrefix` adapts paths to the current role's route namespace.
 */
export function getNotificationLink(
  entityType: NotificationEntityType | null,
  entityId: string | null,
  rolePrefix: string,
  type: NotificationType = 'general',
): string {
  return getNotificationLinkFor({
    type,
    entityType,
    entityId,
    rolePrefix,
  })
}

export function getNotificationLinkFor(input: NotificationLinkInput): string {
  const prefix = normalizePrefix(input.rolePrefix)
  const { type, entityType, entityId } = input

  if (type === 'attendance_absence') {
    if (entityType === 'child' && entityId) {
      return `${prefix}/abana/${entityId}?tab=attendance`
    }
    return `${prefix}/impugukirwa`
  }

  if (type === 'attendance_low_rate') {
    if (prefix === '/caretaker') return `${prefix}/ubwitabire`
    if (prefix === '/district') {
      return entityId ? `${prefix}/ibigo/${entityId}` : DISTRICT_PATHS.monitoringAttendance
    }
    if (prefix === '/ncda') {
      return entityId ? `${prefix}/centers/${entityId}` : `${prefix}/monitoring`
    }
    return `${prefix}/impugukirwa`
  }

  if (!entityType || !entityId) return `${prefix}/amatangazo`

  switch (entityType) {
    case 'child_transfer':
      return `${prefix}/kwimura`
    case 'child':
      return `${prefix}/abana/${entityId}`
    case 'child_nutrition_screening':
      return `${prefix}/abana/${entityId}`
    case 'referral':
      return `${prefix}/abana/${entityId}`
    case 'sted_assessment':
      return `${prefix}/abana/${entityId}`
    case 'compliance_assessment':
      return `${prefix}/isuzuma`
    case 'ecd_center':
      if (prefix === '/caretaker') return `${prefix}/ubwitabire`
      if (prefix === '/district') return `${prefix}/ibigo/${entityId}`
      if (prefix === '/ncda') return `${prefix}/centers/${entityId}`
      return `${prefix}/amatangazo`
    case 'user_account':
      return `${prefix}/abakoresha/${entityId}`
    default:
      return `${prefix}/amatangazo`
  }
}
