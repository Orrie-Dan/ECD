import { useCallback, useMemo, useState } from 'react'
import { env } from '@/config/env'
import { useNutritionAssessments } from '@/features/nutrition/queries'
import { MOCK_NUTRITION_ASSESSMENTS } from '@/lib/mock-data'
import type { NutritionAssessment } from '@/types'

/**
 * Mode-aware nutrition assessments for DataProvider.
 * MOCK → MOCK_NUTRITION_ASSESSMENTS; LIVE → shared LocalStore screening projection.
 *
 * Growth and Nutrition share one offline entity: child_nutrition_screening.
 * Write path remains Growth `recordMeasurement` (Form VII UX) → createScreeningLocalFirst.
 * This repository owns the assessment list + mock sync from growth writes.
 *
 * Backend limitation: no update/delete for nutrition screenings (append-only).
 * Never falls back to MOCK_NUTRITION_ASSESSMENTS when LIVE.
 */
export function useNutritionRepository(childIds: string[]) {
  const [mockAssessments, setMockAssessments] =
    useState<NutritionAssessment[]>(MOCK_NUTRITION_ASSESSMENTS)

  const liveQuery = useNutritionAssessments(childIds, env.isLive && childIds.length > 0)

  const nutritionAssessments: NutritionAssessment[] = useMemo(() => {
    if (!env.isLive) return mockAssessments
    return liveQuery.data ?? []
  }, [liveQuery.data, mockAssessments])

  const nutritionLoading = env.isLive && liveQuery.isLoading
  const nutritionError = env.isLive && liveQuery.isError

  /** MOCK-only: keep assessment list in sync when Growth records/updates measurements. */
  const syncAssessment = useCallback((assessment: NutritionAssessment) => {
    if (env.isLive) return
    setMockAssessments((prev) => {
      const without = prev.filter((a) => a.measurementId !== assessment.measurementId)
      return [...without, assessment]
    })
  }, [])

  const removeAssessmentForMeasurement = useCallback((measurementId: string) => {
    if (env.isLive) return
    setMockAssessments((prev) => prev.filter((a) => a.measurementId !== measurementId))
  }, [])

  const getChildAssessments = useCallback(
    (childId: string) => nutritionAssessments.filter((a) => a.childId === childId),
    [nutritionAssessments],
  )

  return {
    nutritionAssessments,
    nutritionLoading,
    nutritionError,
    getChildAssessments,
    syncAssessment,
    removeAssessmentForMeasurement,
  }
}
