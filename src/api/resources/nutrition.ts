import { isNotFoundError } from '@/api/errors'
import {
  nutritionControllerCreateScreening,
  nutritionControllerGetAlerts,
  nutritionControllerGetGrowthChart,
  nutritionControllerGetHistory,
  nutritionControllerListScreenings,
} from '@/api/generated/endpoints/nutrition/nutrition'
import {
  mapGrowthChartToViewModel,
  mapScreeningToAssessment as mapScreeningToGrowthAssessment,
  mapScreeningToMeasurement,
} from '@/api/mappers/growth.mapper'
import {
  mapNutritionAlertsToViewModel,
  mapNutritionHistoryToViewModel,
  mapPaginatedScreeningsToViewModel,
  mapScreeningCreateToDto,
  mapScreeningToNutritionAssessment,
} from '@/api/mappers/nutrition.mapper'
import type {
  GrowthChartViewModel,
  GrowthHistoryResult,
  GrowthRosterResult,
} from '@/models/growth'
import type {
  NutritionAlertFilters,
  NutritionAlertsResult,
  NutritionAssessmentViewModel,
  NutritionHistoryResult,
  NutritionScreeningCreateInput,
} from '@/models/nutrition'
import type {
  NutritionScreeningListFilters,
  NutritionScreeningListResult,
} from '@/models/nutrition-screenings'

export async function fetchNutritionHistory(childId: string): Promise<NutritionHistoryResult> {
  const dto = await nutritionControllerGetHistory(childId)
  return mapNutritionHistoryToViewModel(dto)
}

/** Shared per-child history for Growth dual-mapping. */
export async function fetchScreeningHistory(childId: string): Promise<GrowthHistoryResult> {
  try {
    const dto = await nutritionControllerGetHistory(childId)
    return {
      childId: dto.childId,
      measurements: dto.items.map(mapScreeningToMeasurement),
      assessments: dto.items.map(mapScreeningToGrowthAssessment),
      total: dto.total,
    }
  } catch (err) {
    if (isNotFoundError(err)) {
      return { childId, measurements: [], assessments: [], total: 0 }
    }
    throw err
  }
}

/** One roster fetch shared by Growth measurements + Nutrition assessments. */
export async function fetchScreeningRoster(childIds: string[]): Promise<GrowthRosterResult> {
  if (childIds.length === 0) {
    return { measurements: [], assessments: [] }
  }
  const histories = await Promise.all(childIds.map((id) => fetchScreeningHistory(id)))
  return {
    measurements: histories.flatMap((h) => h.measurements),
    assessments: histories.flatMap((h) => h.assessments),
  }
}

export async function fetchNutritionAssessmentsRoster(
  childIds: string[],
): Promise<NutritionAssessmentViewModel[]> {
  const roster = await fetchScreeningRoster(childIds)
  return roster.assessments.map((a) => ({
    ...a,
    version: a.version,
  }))
}

export async function createNutritionScreeningRequest(
  input: NutritionScreeningCreateInput,
): Promise<NutritionAssessmentViewModel> {
  const body = mapScreeningCreateToDto(input)
  const dto = await nutritionControllerCreateScreening(input.childId, body)
  return mapScreeningToNutritionAssessment(dto)
}

export async function createScreeningForGrowthRequest(input: NutritionScreeningCreateInput) {
  const body = mapScreeningCreateToDto(input)
  const dto = await nutritionControllerCreateScreening(input.childId, body)
  const measurement = mapScreeningToMeasurement(dto)
  const assessment = mapScreeningToGrowthAssessment(dto)
  if (input.recordedBy) {
    measurement.recordedBy = input.recordedBy
  }
  return { measurement, assessment, nutritionAssessment: mapScreeningToNutritionAssessment(dto) }
}

export async function fetchNutritionAlerts(
  filters: NutritionAlertFilters = {},
): Promise<NutritionAlertsResult> {
  const dto = await nutritionControllerGetAlerts({
    districtId: filters.districtId,
    centerId: filters.centerId,
    date: filters.date,
    status: filters.status,
    nutritionStatus: filters.nutritionStatus,
  })
  return mapNutritionAlertsToViewModel(dto)
}

/** District operational screening list — GET /nutrition/screenings. */
export async function fetchNutritionScreeningList(
  filters: NutritionScreeningListFilters = {},
): Promise<NutritionScreeningListResult> {
  const dto = await nutritionControllerListScreenings({
    centerId: filters.centerId,
    childId: filters.childId,
    from: filters.from,
    to: filters.to,
    nutritionStatus: filters.nutritionStatus,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
  })
  return mapPaginatedScreeningsToViewModel(dto)
}

/** Fetch every page matching filters — used for scoped Excel export. */
export async function fetchAllNutritionScreenings(
  filters: Omit<NutritionScreeningListFilters, 'page' | 'pageSize'> = {},
): Promise<NutritionScreeningListResult['items']> {
  const pageSize = 200
  let page = 1
  const items: NutritionScreeningListResult['items'] = []

  for (;;) {
    const result = await fetchNutritionScreeningList({ ...filters, page, pageSize })
    items.push(...result.items)
    const totalPages = Math.max(1, result.totalPages)
    if (page >= totalPages) break
    page += 1
  }

  return items
}

export async function fetchChildGrowthChart(childId: string): Promise<GrowthChartViewModel> {
  const dto = await nutritionControllerGetGrowthChart(childId)
  return mapGrowthChartToViewModel(dto)
}
