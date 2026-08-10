import type {
  CreateNutritionScreeningDto,
  GrowthChartResponseDto,
  NutritionHistoryResponseDto,
  NutritionScreeningResponseDto,
  NutritionStatus as ApiNutritionStatus,
} from '@/api/generated/models'
import type {
  GrowthAssessmentViewModel,
  GrowthChartViewModel,
  GrowthHistoryResult,
  GrowthMeasurementCreateInput,
  GrowthMeasurementViewModel,
  GrowthRosterResult,
} from '@/models/growth'
import type { GrowthMeasurement, NutritionAssessment, NutritionStatus } from '@/types'
import { classifyNutrition, requiresReferral } from '@/lib/nutrition'

function mapNutritionStatusToUi(
  value: ApiNutritionStatus | string | null | undefined,
): NutritionStatus {
  if (
    value === 'normal' ||
    value === 'at_risk' ||
    value === 'moderate' ||
    value === 'severe'
  ) {
    return value
  }
  return 'normal'
}

/** Screening DTO → measurement view model. */
export function mapScreeningToMeasurement(
  dto: NutritionScreeningResponseDto,
): GrowthMeasurementViewModel {
  const nutritionStatus = mapNutritionStatusToUi(dto.nutritionStatus)
  return {
    id: dto.id,
    childId: dto.childId,
    date: dto.screeningDate,
    weightKg: dto.weightKg,
    heightCm: dto.heightCm ?? 0,
    muacCm: dto.muacCm,
    headCircumferenceCm: dto.headCircumferenceCm ?? undefined,
    notes: dto.dietNotes ?? undefined,
    recordedBy: dto.recordedById,
    version: dto.version,
    nutritionStatus,
    requiresReferral: dto.requiresReferral,
    recordedById: dto.recordedById,
  }
}

/** Screening DTO → assessment view model (same id as measurement for linkage). */
export function mapScreeningToAssessment(
  dto: NutritionScreeningResponseDto,
): GrowthAssessmentViewModel {
  const nutritionStatus = mapNutritionStatusToUi(dto.nutritionStatus)
  return {
    id: dto.id,
    childId: dto.childId,
    measurementId: dto.id,
    date: dto.screeningDate,
    status: nutritionStatus,
    requiresReferral: dto.requiresReferral,
    notes: dto.dietNotes ?? undefined,
    version: dto.version,
  }
}

export function mapHistoryToViewModel(dto: NutritionHistoryResponseDto): GrowthHistoryResult {
  return {
    childId: dto.childId,
    measurements: dto.items.map(mapScreeningToMeasurement),
    assessments: dto.items.map(mapScreeningToAssessment),
    total: dto.total,
  }
}

export function mapRosterFromHistories(histories: GrowthHistoryResult[]): GrowthRosterResult {
  return {
    measurements: histories.flatMap((h) => h.measurements),
    assessments: histories.flatMap((h) => h.assessments),
  }
}

export function mapGrowthChartToViewModel(dto: GrowthChartResponseDto): GrowthChartViewModel {
  return {
    childId: dto.childId,
    weight: dto.weight.map((p) => ({ date: p.date, value: p.value })),
    muac: dto.muac.map((p) => ({ date: p.date, value: p.value })),
    height: dto.height.map((p) => ({ date: p.date, value: p.value })),
    headCircumference: dto.headCircumference.map((p) => ({ date: p.date, value: p.value })),
  }
}

/**
 * Build create DTO. Frontend classifies MUAC status — API requires nutritionStatus.
 * Omits zero/empty optional anthropometrics.
 */
export function mapMeasurementToCreateDto(
  input: GrowthMeasurementCreateInput,
): CreateNutritionScreeningDto {
  const nutritionStatus = classifyNutrition({
    muacCm: input.muacCm,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
  })

  return {
    screeningDate: input.date,
    weightKg: input.weightKg,
    muacCm: input.muacCm,
    nutritionStatus,
    requiresReferral: requiresReferral(nutritionStatus),
    ...(input.heightCm > 0 ? { heightCm: input.heightCm } : {}),
    ...(input.headCircumferenceCm && input.headCircumferenceCm > 0
      ? { headCircumferenceCm: input.headCircumferenceCm }
      : {}),
    ...(input.notes?.trim() ? { dietNotes: input.notes.trim() } : {}),
  }
}

export function asGrowthMeasurementViewModel(
  measurement: GrowthMeasurement,
  assessment?: NutritionAssessment,
): GrowthMeasurementViewModel {
  const version =
    'version' in measurement && typeof (measurement as GrowthMeasurementViewModel).version === 'number'
      ? (measurement as GrowthMeasurementViewModel).version
      : 0
  const nutritionStatus =
    assessment?.status ??
    ('nutritionStatus' in measurement
      ? (measurement as GrowthMeasurementViewModel).nutritionStatus
      : classifyNutrition({
          muacCm: measurement.muacCm,
          weightKg: measurement.weightKg,
          heightCm: measurement.heightCm,
        }))
  return {
    ...measurement,
    version,
    nutritionStatus,
    requiresReferral:
      assessment?.requiresReferral ??
      ('requiresReferral' in measurement
        ? Boolean((measurement as GrowthMeasurementViewModel).requiresReferral)
        : requiresReferral(nutritionStatus)),
  }
}
