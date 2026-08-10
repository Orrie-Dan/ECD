import type {
  CreateNutritionScreeningDto,
  NutritionAlertDto,
  NutritionAlertsResponseDto,
  NutritionHistoryResponseDto,
  NutritionScreeningResponseDto,
  NutritionStatus as ApiNutritionStatus,
} from '@/api/generated/models'
import { classifyNutrition, requiresReferral } from '@/lib/nutrition'
import type {
  NutritionAlertViewModel,
  NutritionAlertsResult,
  NutritionAssessmentViewModel,
  NutritionHistoryResult,
  NutritionScreeningCreateInput,
} from '@/models/nutrition'
import type { NutritionStatus } from '@/types'

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

/** Screening DTO → assessment view model. */
export function mapScreeningToNutritionAssessment(
  dto: NutritionScreeningResponseDto,
): NutritionAssessmentViewModel {
  const status = mapNutritionStatusToUi(dto.nutritionStatus)
  return {
    id: dto.id,
    childId: dto.childId,
    measurementId: dto.id,
    date: dto.screeningDate,
    status,
    requiresReferral: dto.requiresReferral,
    notes: dto.dietNotes ?? undefined,
    version: dto.version,
    weightKg: dto.weightKg,
    muacCm: dto.muacCm,
    heightCm: dto.heightCm ?? undefined,
    recordedById: dto.recordedById,
  }
}

export function mapNutritionHistoryToViewModel(
  dto: NutritionHistoryResponseDto,
): NutritionHistoryResult {
  return {
    childId: dto.childId,
    assessments: dto.items.map(mapScreeningToNutritionAssessment),
    total: dto.total,
  }
}

export function mapNutritionAlertDtoToViewModel(dto: NutritionAlertDto): NutritionAlertViewModel {
  return {
    id: `${dto.type}:${dto.childId}:${dto.screeningId ?? dto.screeningDate ?? 'none'}`,
    type: dto.type,
    childId: dto.childId,
    childFullName: dto.childFullName,
    centerId: dto.centerId,
    centerName: dto.centerName ?? undefined,
    screeningId: dto.screeningId ?? undefined,
    screeningDate: dto.screeningDate ?? undefined,
    nutritionStatus: dto.nutritionStatus
      ? mapNutritionStatusToUi(dto.nutritionStatus)
      : undefined,
    requiresReferral: dto.requiresReferral ?? undefined,
    message: dto.message,
  }
}

export function mapNutritionAlertsToViewModel(
  dto: NutritionAlertsResponseDto,
): NutritionAlertsResult {
  return {
    items: dto.items.map(mapNutritionAlertDtoToViewModel),
    total: dto.total,
  }
}

export function mapScreeningCreateToDto(
  input: NutritionScreeningCreateInput,
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
    ...(input.heightCm && input.heightCm > 0 ? { heightCm: input.heightCm } : {}),
    ...(input.headCircumferenceCm && input.headCircumferenceCm > 0
      ? { headCircumferenceCm: input.headCircumferenceCm }
      : {}),
    ...(input.notes?.trim() ? { dietNotes: input.notes.trim() } : {}),
  }
}
