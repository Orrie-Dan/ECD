/**
 * Shared nutrition / MUAC calculation primitives.
 * Single source of truth for thresholds and status classification.
 * UI helpers and roster aggregations remain in `@/lib/nutrition-utils`.
 */
import type { AssessmentDueStatus, NutritionStatus } from '@/types'

/** UNICEF/Rwanda MUAC screening thresholds (cm) — MVP, not WHO z-scores. */
export const MUAC_SEVERE_CM = 11.5
export const MUAC_MODERATE_CM = 12.5
export const MUAC_AT_RISK_CM = 13.5

/** Days between recommended growth/nutrition assessments. */
export const ASSESSMENT_INTERVAL_DAYS = 30

/** Days after which an assessment is overdue (frontend band). */
export const ASSESSMENT_OVERDUE_DAYS = 45

export function classifyNutrition(input: {
  muacCm: number
  weightKg?: number
  heightCm?: number
}): NutritionStatus {
  if (input.muacCm < MUAC_SEVERE_CM) return 'severe'
  if (input.muacCm < MUAC_MODERATE_CM) return 'moderate'
  if (input.muacCm < MUAC_AT_RISK_CM) return 'at_risk'
  return 'normal'
}

export function requiresReferral(status: NutritionStatus): boolean {
  return status === 'severe' || status === 'moderate'
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function getAssessmentDueStatus(
  latestDate: string | undefined,
  today = getTodayDate(),
): AssessmentDueStatus {
  if (!latestDate) return 'never'
  const days = daysBetween(latestDate, today)
  if (days >= ASSESSMENT_OVERDUE_DAYS) return 'overdue'
  if (days >= ASSESSMENT_INTERVAL_DAYS) return 'due'
  return 'up_to_date'
}

export function getNextAssessmentDate(latestDate: string | undefined): string | undefined {
  if (!latestDate) return undefined
  const d = new Date(latestDate)
  d.setDate(d.getDate() + ASSESSMENT_INTERVAL_DAYS)
  return d.toISOString().split('T')[0]
}
