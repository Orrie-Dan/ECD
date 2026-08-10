import { requiresReferral } from '@/lib/nutrition-utils'
import type { ReferralCreateInput } from '@/models/referral'
import type { NutritionAssessment, StedAssessment } from '@/types'

/** Whether a nutrition/MUAC assessment should create a referral. */
export function shouldCreateNutritionReferral(assessment: NutritionAssessment): boolean {
  return requiresReferral(assessment.status) || assessment.requiresReferral
}

/** Build create payload from a nutrition screening assessment. */
export function buildNutritionReferralInput(
  assessment: NutritionAssessment,
): ReferralCreateInput {
  return {
    childId: assessment.childId,
    assessmentId: assessment.id,
    sourceType: 'nutrition',
    date: assessment.date,
    reason: `MUAC — ${assessment.status}`,
    status: 'pending',
    destination: 'Ikigo nderabuzima',
  }
}

/** Whether a STED assessment should create a referral. */
export function shouldCreateStedReferral(assessment: StedAssessment): boolean {
  return !!assessment.outcome.referred
}

/** Build create payload from a STED assessment (after successful persist). */
export function buildStedReferralInput(assessment: StedAssessment): ReferralCreateInput {
  return {
    childId: assessment.childId,
    assessmentId: assessment.id,
    sourceType: 'sted',
    date: assessment.assessmentDate,
    reason: assessment.referralReason?.trim() || 'STED — ikibazo cyahamwe',
    status: 'pending',
    destination: assessment.referralDestination?.trim() || 'Ikigo nderabuzima',
  }
}
