import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryStaleTimes } from '@/api/query-keys'
import { fetchNutritionAlerts, fetchNutritionScreeningList } from '@/api/resources/nutrition'
import type { NutritionAlertFilters } from '@/models/nutrition'
import type { NutritionScreeningListFilters } from '@/models/nutrition-screenings'

/**
 * District LIVE nutrition alerts — GET /api/v1/nutrition/alerts.
 * Not a paginated screening roster.
 */
export function useDistrictNutritionAlerts(
  filters: NutritionAlertFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: district.keys.nutrition.alerts(filters),
    queryFn: () => fetchNutritionAlerts(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.nutritionAlerts,
    retry: 0,
  })
}

/**
 * District LIVE operational screenings — GET /api/v1/nutrition/screenings.
 */
export function useDistrictNutritionScreenings(
  filters: NutritionScreeningListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: district.keys.nutrition.screenings(filters as Record<string, unknown>),
    queryFn: () => fetchNutritionScreeningList(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.nutritionRoster,
    retry: 0,
  })
}
