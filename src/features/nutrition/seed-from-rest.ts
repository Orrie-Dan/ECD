import type { LocalStore } from '@/storage/local-store'
import type { LocalNutritionScreeningRecord } from '@/storage/types'
import type { GrowthMeasurementViewModel } from '@/models/growth'
import type { NutritionAssessmentViewModel } from '@/models/nutrition'
import { classifyNutrition, requiresReferral } from '@/lib/nutrition'

/** Seed REST roster/history items into IDB as clean screening records (bootstrap only). */
export async function mapScreeningRosterToLocalSeed(
  store: LocalStore,
  measurements: GrowthMeasurementViewModel[],
  assessments?: NutritionAssessmentViewModel[],
): Promise<void> {
  if (measurements.length === 0) return
  const now = new Date().toISOString()
  const assessmentById = new Map((assessments ?? []).map((a) => [a.id, a]))

  const rows: LocalNutritionScreeningRecord[] = measurements.map((m) => {
    const assessment = assessmentById.get(m.id)
    const nutritionStatus =
      m.nutritionStatus ??
      assessment?.status ??
      classifyNutrition({
        muacCm: m.muacCm,
        weightKg: m.weightKg,
        heightCm: m.heightCm,
      })
    const reqReferral =
      m.requiresReferral ??
      assessment?.requiresReferral ??
      requiresReferral(nutritionStatus)

    return {
      id: m.id,
      childId: m.childId,
      centerId: '',
      screeningDate: m.date,
      weightKg: m.weightKg,
      muacCm: m.muacCm,
      heightCm: m.heightCm > 0 ? m.heightCm : null,
      headCircumferenceCm: m.headCircumferenceCm ?? null,
      nutritionStatus,
      requiresReferral: reqReferral,
      mealQuality: null,
      feedingConcern: false,
      dietNotes: m.notes ?? assessment?.notes ?? null,
      recordedById: m.recordedById ?? m.recordedBy ?? '',
      version: m.version ?? assessment?.version ?? 1,
      deletedAt: null,
      lastModifiedAt: now,
      createdAt: null,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    }
  })

  await store.putNutritionScreenings(rows)
}
