/**
 * Feeding resource layer — wraps generated OpenAPI client + mappers.
 * Feature hooks import from here; UI never imports Feeding*Dto types.
 */
import {
  feedingControllerListDaily,
  feedingControllerListMonthSummaries,
  feedingControllerUpsertDaily,
  feedingControllerUpsertMonthSummary,
} from '@/api/generated/endpoints/feeding/feeding'
import {
  mapFeedingDayDtoToViewModel,
  mapFeedingDayUpsertToDto,
  mapFeedingMonthSummaryDtoToViewModel,
  mapFeedingMonthSummaryUpsertToDto,
  mapPaginatedFeedingDaysToViewModel,
  mapPaginatedFeedingMonthSummariesToViewModel,
  mergeUiFieldsOntoFeedingDay,
  mergeUiFieldsOntoFeedingMonthSummary,
} from '@/api/mappers/feeding.mapper'
import type {
  FeedingDayListFilters,
  FeedingDayListResult,
  FeedingDayUpsertInput,
  FeedingDayViewModel,
  FeedingMonthSummaryListFilters,
  FeedingMonthSummaryListResult,
  FeedingMonthSummaryUpsertInput,
  FeedingMonthSummaryViewModel,
} from '@/models/feeding'

export async function fetchFeedingDayList(
  filters: FeedingDayListFilters,
): Promise<FeedingDayListResult> {
  const dto = await feedingControllerListDaily(filters.centerId, {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 200,
  })
  const result = mapPaginatedFeedingDaysToViewModel(dto)

  // Client-side date filters — API list has no startDate/endDate/yearMonth yet.
  let items = result.items
  if (filters.yearMonth) {
    items = items.filter((d) => d.date.startsWith(filters.yearMonth!))
  }
  if (filters.startDate) {
    items = items.filter((d) => d.date >= filters.startDate!)
  }
  if (filters.endDate) {
    items = items.filter((d) => d.date <= filters.endDate!)
  }

  return { ...result, items }
}

/** Fetch all pages of daily feeding for a center (pageSize capped for pagination loop). */
export async function fetchAllFeedingDays(
  filters: Omit<FeedingDayListFilters, 'page' | 'pageSize'>,
): Promise<FeedingDayViewModel[]> {
  const pageSize = 200
  let page = 1
  let totalPages = 1
  const items: FeedingDayViewModel[] = []

  // Paginate without client date filters so totalPages stays accurate.
  do {
    const result = await fetchFeedingDayList({
      centerId: filters.centerId,
      page,
      pageSize,
    })
    items.push(...result.items)
    totalPages = Math.max(1, result.totalPages)
    page += 1
  } while (page <= totalPages)

  let all = items
  if (filters.yearMonth) {
    all = all.filter((d) => d.date.startsWith(filters.yearMonth!))
  }
  if (filters.startDate) {
    all = all.filter((d) => d.date >= filters.startDate!)
  }
  if (filters.endDate) {
    all = all.filter((d) => d.date <= filters.endDate!)
  }
  return all
}

export async function fetchFeedingMonthSummaryList(
  filters: FeedingMonthSummaryListFilters,
): Promise<FeedingMonthSummaryListResult> {
  const dto = await feedingControllerListMonthSummaries(filters.centerId, {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 200,
  })
  const result = mapPaginatedFeedingMonthSummariesToViewModel(dto)

  let items = result.items
  if (filters.yearMonth) {
    items = items.filter((s) => s.yearMonth === filters.yearMonth)
  }
  return { ...result, items }
}

export async function fetchAllFeedingMonthSummaries(
  filters: Omit<FeedingMonthSummaryListFilters, 'page' | 'pageSize'>,
): Promise<FeedingMonthSummaryViewModel[]> {
  const pageSize = 200
  let page = 1
  let totalPages = 1
  const items: FeedingMonthSummaryViewModel[] = []

  do {
    const result = await fetchFeedingMonthSummaryList({
      centerId: filters.centerId,
      page,
      pageSize,
    })
    items.push(...result.items)
    totalPages = Math.max(1, result.totalPages)
    page += 1
  } while (page <= totalPages)

  if (filters.yearMonth) {
    return items.filter((s) => s.yearMonth === filters.yearMonth)
  }
  return items
}

export async function upsertFeedingDayRequest(
  input: FeedingDayUpsertInput,
): Promise<FeedingDayViewModel> {
  const dto = await feedingControllerUpsertDaily(mapFeedingDayUpsertToDto(input))
  const mapped = mapFeedingDayDtoToViewModel(dto)
  return mergeUiFieldsOntoFeedingDay(mapped, input)
}

export async function upsertFeedingMonthSummaryRequest(
  input: FeedingMonthSummaryUpsertInput,
): Promise<FeedingMonthSummaryViewModel> {
  const dto = await feedingControllerUpsertMonthSummary(mapFeedingMonthSummaryUpsertToDto(input))
  const mapped = mapFeedingMonthSummaryDtoToViewModel(dto)
  return mergeUiFieldsOntoFeedingMonthSummary(mapped, input)
}
