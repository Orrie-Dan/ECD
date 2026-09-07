import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import { fetchNutritionAlerts } from '@/api/resources/nutrition'
import type { NutritionAlertFilters } from '@/models/nutrition'

/**
 * NCDA LIVE nutrition alerts — GET /api/v1/nutrition/alerts (national or scoped).
 */
export function useNcdaNutritionAlerts(
  filters: NutritionAlertFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ncda.keys.monitoring.nutritionAlerts(filters as Record<string, unknown>),
    queryFn: () => fetchNutritionAlerts(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.nutritionAlerts,
    retry: 0,
  })
}
