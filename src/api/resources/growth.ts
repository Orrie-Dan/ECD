/**
 * Growth resource layer — measurement-focused façade over shared nutrition screening APIs.
 */
import {
  createScreeningForGrowthRequest,
  fetchChildGrowthChart,
  fetchScreeningHistory,
  fetchScreeningRoster,
} from '@/api/resources/nutrition'
import type {
  GrowthHistoryResult,
  GrowthMeasurementCreateInput,
  GrowthMeasurementViewModel,
  GrowthAssessmentViewModel,
  GrowthRosterResult,
} from '@/models/growth'

export async function fetchChildGrowthHistory(childId: string): Promise<GrowthHistoryResult> {
  return fetchScreeningHistory(childId)
}

export { fetchChildGrowthChart }

export async function fetchGrowthRoster(childIds: string[]): Promise<GrowthRosterResult> {
  return fetchScreeningRoster(childIds)
}

export async function createGrowthMeasurementRequest(
  input: GrowthMeasurementCreateInput,
): Promise<{
  measurement: GrowthMeasurementViewModel
  assessment: GrowthAssessmentViewModel
}> {
  const result = await createScreeningForGrowthRequest({
    childId: input.childId,
    date: input.date,
    weightKg: input.weightKg,
    muacCm: input.muacCm,
    heightCm: input.heightCm,
    headCircumferenceCm: input.headCircumferenceCm,
    notes: input.notes,
    recordedBy: input.recordedBy,
  })
  return { measurement: result.measurement, assessment: result.assessment }
}
