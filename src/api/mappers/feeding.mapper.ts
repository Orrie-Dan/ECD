import type {
  FeedingDayResponseDto,
  FeedingMonthSummaryResponseDto,
  PaginatedFeedingDaysResponseDto,
  PaginatedFeedingMonthSummariesResponseDto,
  UpsertFeedingDayDto,
  UpsertFeedingMonthSummaryDto,
} from '@/api/generated/models'
import type {
  FeedingDayListResult,
  FeedingDayUpsertInput,
  FeedingDayViewModel,
  FeedingMonthSummaryListResult,
  FeedingMonthSummaryUpsertInput,
  FeedingMonthSummaryViewModel,
  FoodGroupValue,
} from '@/models/feeding'
import type { BalancedMealComposition, CenterFeedingDay, CenterFeedingMonthSummary } from '@/types'
import { emptyComposition, isBalancedComposition } from '@/lib/feeding-utils'

/** Authoritative Form VI food-group keys (API boolean field names). */
export const FOOD_GROUP_VALUES: FoodGroupValue[] = [
  'cerealsOrTubers',
  'legumes',
  'dairy',
  'animalProducts',
  'fruitsVegetables',
  'addedFat',
]

function compositionFromDto(dto: FeedingDayResponseDto): BalancedMealComposition | undefined {
  const composition: BalancedMealComposition = {
    cerealsOrTubers: dto.cerealsOrTubers,
    legumes: dto.legumes,
    dairy: dto.dairy,
    animalProducts: dto.animalProducts,
    fruitsVegetables: dto.fruitsVegetables,
    addedFat: dto.addedFat,
  }
  const anyTrue = FOOD_GROUP_VALUES.some((key) => composition[key])
  if (!anyTrue && !dto.balancedMealServed) return undefined
  return composition
}

/** Map daily feeding DTO → view model (`recordedDate` → `date`, nest food groups). */
export function mapFeedingDayDtoToViewModel(dto: FeedingDayResponseDto): FeedingDayViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    date: dto.recordedDate,
    milkServed: dto.milkServed,
    porridgeServed: dto.porridgeServed,
    balancedMealServed: dto.balancedMealServed,
    composition: compositionFromDto(dto),
    recordedBy: dto.recordedBy,
    version: dto.version,
    warnings: dto.warnings?.length ? dto.warnings : undefined,
    recordedAt: dto.recordedAt,
  }
}

export function mapPaginatedFeedingDaysToViewModel(
  dto: PaginatedFeedingDaysResponseDto,
): FeedingDayListResult {
  return {
    items: dto.items.map(mapFeedingDayDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

/** Map month-summary DTO → view model (`recordedAt`/`recordedBy` → UI updated fields). */
export function mapFeedingMonthSummaryDtoToViewModel(
  dto: FeedingMonthSummaryResponseDto,
): FeedingMonthSummaryViewModel {
  return {
    id: dto.id,
    centerId: dto.centerId,
    yearMonth: dto.yearMonth,
    milkLiters: dto.milkLiters,
    flourKg: dto.flourKg,
    foodSource: dto.foodSource,
    updatedAt: dto.recordedAt ? dto.recordedAt.split('T')[0] : undefined,
    updatedBy: dto.recordedBy ?? undefined,
    version: dto.version,
  }
}

export function mapPaginatedFeedingMonthSummariesToViewModel(
  dto: PaginatedFeedingMonthSummariesResponseDto,
): FeedingMonthSummaryListResult {
  return {
    items: dto.items.map(mapFeedingMonthSummaryDtoToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

/**
 * Build upsert day DTO. Flattens nested `composition` into API booleans.
 * Coerces `balancedMealServed` to false when composition is incomplete (UI rule).
 */
export function mapFeedingDayUpsertToDto(input: FeedingDayUpsertInput): UpsertFeedingDayDto {
  const composition = input.composition ?? emptyComposition()
  const balanced =
    input.balancedMealServed && isBalancedComposition(composition) ? true : false
  const groups = balanced ? composition : emptyComposition()

  return {
    centerId: input.centerId,
    recordedDate: input.date,
    milkServed: input.milkServed,
    porridgeServed: input.porridgeServed,
    balancedMealServed: balanced,
    cerealsOrTubers: groups.cerealsOrTubers,
    legumes: groups.legumes,
    dairy: groups.dairy,
    animalProducts: groups.animalProducts,
    fruitsVegetables: groups.fruitsVegetables,
    addedFat: groups.addedFat,
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
  }
}

export function mapFeedingMonthSummaryUpsertToDto(
  input: FeedingMonthSummaryUpsertInput,
): UpsertFeedingMonthSummaryDto {
  return {
    centerId: input.centerId,
    yearMonth: input.yearMonth,
    milkLiters: input.milkLiters,
    flourKg: input.flourKg,
    foodSource: input.foodSource.trim(),
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
  }
}

/**
 * Preserve display `recordedBy` / `updatedBy` from the upsert input when the API
 * returns a user UUID — same-session UX stays intact without a contract change.
 */
export function mergeUiFieldsOntoFeedingDay(
  apiRecord: FeedingDayViewModel,
  input: FeedingDayUpsertInput,
): FeedingDayViewModel {
  return {
    ...apiRecord,
    recordedBy: input.recordedBy ?? apiRecord.recordedBy,
    composition: input.balancedMealServed
      ? (input.composition ?? apiRecord.composition)
      : undefined,
  }
}

export function mergeUiFieldsOntoFeedingMonthSummary(
  apiRecord: FeedingMonthSummaryViewModel,
  input: FeedingMonthSummaryUpsertInput,
): FeedingMonthSummaryViewModel {
  return {
    ...apiRecord,
    updatedBy: input.updatedBy ?? apiRecord.updatedBy,
  }
}

/** Narrow CenterFeedingDay → FeedingDayViewModel when version is known. */
export function asFeedingDayViewModel(record: CenterFeedingDay): FeedingDayViewModel {
  const version =
    'version' in record && typeof (record as FeedingDayViewModel).version === 'number'
      ? (record as FeedingDayViewModel).version
      : 0
  return { ...record, version }
}

export function asFeedingMonthSummaryViewModel(
  record: CenterFeedingMonthSummary,
): FeedingMonthSummaryViewModel {
  const version =
    'version' in record && typeof (record as FeedingMonthSummaryViewModel).version === 'number'
      ? (record as FeedingMonthSummaryViewModel).version
      : 0
  return { ...record, version }
}
