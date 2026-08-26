import { district } from '@/locales/rw/district'
import type { AssessmentDueStatus, NutritionStatus, ReferralSourceType, ReferralStatus } from '@/types'

const NUTRITION_STATUS_LABEL: Record<NutritionStatus, string> = {
  normal: district.growth.statusNormal,
  at_risk: district.growth.statusAtRisk,
  moderate: district.growth.statusModerate,
  severe: district.growth.statusSevere,
}

const DUE_STATUS_LABEL: Record<AssessmentDueStatus, string> = {
  up_to_date: district.growth.statusNormal,
  due: district.growth.alertDue,
  overdue: district.growth.alertOverdue,
  never: district.growth.notAssessed,
}

const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: district.referrals.pending,
  completed: district.referrals.completed,
  cancelled: district.referrals.cancelled,
}

const REFERRAL_SOURCE_LABEL: Record<ReferralSourceType, string> = {
  nutrition: district.referrals.sourceNutrition,
  sted: district.referrals.sourceSted,
}

export function nutritionStatusExportLabel(status: NutritionStatus | undefined): string {
  if (!status) return district.growth.notAssessed
  return NUTRITION_STATUS_LABEL[status]
}

export function assessmentDueExportLabel(status: AssessmentDueStatus): string {
  return DUE_STATUS_LABEL[status]
}

export function referralStatusExportLabel(status: ReferralStatus): string {
  return REFERRAL_STATUS_LABEL[status]
}

export function referralSourceExportLabel(sourceType: ReferralSourceType): string {
  return REFERRAL_SOURCE_LABEL[sourceType]
}

export function referralFollowUpExportLabel(
  status: ReferralStatus,
  implementedAt?: string,
): string {
  if (status === 'completed') {
    return implementedAt
      ? `${district.referrals.completed} (${implementedAt.slice(0, 10)})`
      : district.referrals.completed
  }
  if (status === 'cancelled') return district.referrals.cancelled
  return district.referrals.open
}
