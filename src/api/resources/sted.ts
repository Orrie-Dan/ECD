import { isNotFoundError } from '@/api/errors'
import {
  stedControllerCreate,
  stedControllerFindOne,
  stedControllerGetHistory,
} from '@/api/generated/endpoints/sted/sted'
import {
  mapStedCreateToDto,
  mapStedDtoToViewModel,
  mapStedHistoryToViewModel,
  mergeUiFieldsOntoSted,
} from '@/api/mappers/sted.mapper'
import type {
  StedAssessmentCreateInput,
  StedAssessmentViewModel,
  StedHistoryFilters,
  StedHistoryResult,
} from '@/models/sted'

export async function fetchStedDetail(id: string): Promise<StedAssessmentViewModel> {
  const dto = await stedControllerFindOne(id)
  return mapStedDtoToViewModel(dto)
}

export async function fetchChildStedHistory(
  childId: string,
  filters: StedHistoryFilters = {},
): Promise<StedHistoryResult> {
  try {
    const dto = await stedControllerGetHistory(childId, {
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 200,
    })
    return mapStedHistoryToViewModel(dto)
  } catch (err) {
    if (isNotFoundError(err)) {
      return {
        childId,
        items: [],
        total: 0,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 200,
        totalPages: 1,
      }
    }
    throw err
  }
}

/** Fetch all history pages for a child. */
export async function fetchAllChildStedHistory(
  childId: string,
): Promise<StedAssessmentViewModel[]> {
  const pageSize = 200
  let page = 1
  let totalPages = 1
  const items: StedAssessmentViewModel[] = []

  do {
    const result = await fetchChildStedHistory(childId, { page, pageSize })
    items.push(...result.items)
    totalPages = Math.max(1, result.totalPages)
    page += 1
  } while (page <= totalPages)

  return items
}

/**
 * Multi-child roster via fan-out of per-child history.
 * Safe workaround until a center-scoped list endpoint exists
 * (same pattern as growth/nutrition screening roster).
 */
export async function fetchStedRoster(
  childIds: string[],
): Promise<StedAssessmentViewModel[]> {
  if (childIds.length === 0) return []
  const histories = await Promise.all(childIds.map((id) => fetchAllChildStedHistory(id)))
  return histories.flat()
}

export async function createStedAssessmentRequest(
  input: StedAssessmentCreateInput,
): Promise<StedAssessmentViewModel> {
  const dto = await stedControllerCreate(mapStedCreateToDto(input))
  const mapped = mapStedDtoToViewModel(dto)
  return mergeUiFieldsOntoSted(mapped, input)
}
