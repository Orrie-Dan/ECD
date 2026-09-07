import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { localFirstQueryOptions, nutrition, queryStaleTimes } from '@/api/query-keys'
import {
  fetchNutritionAlerts,
  fetchNutritionHistory,
  fetchScreeningRoster,
} from '@/api/resources/nutrition'
import {
  listScreeningsFromLocal,
  localScreeningToAssessment,
  localScreeningToMeasurement,
} from '@/features/nutrition/local-screenings'
import { mapScreeningRosterToLocalSeed } from '@/features/nutrition/seed-from-rest'
import { getLocalStore } from '@/storage'
import { networkState } from '@/network/network-state'
import { filterSyncedChildIds, shouldSkipRemoteChildHistory } from '@/sync/child-sync-state'
import type { NutritionAlertFilters } from '@/models/nutrition'
import type { GrowthRosterResult } from '@/models/growth'

async function loadRosterFromLocalOrRemote(
  childIds: string[],
): Promise<GrowthRosterResult> {
  const store = getLocalStore()
  const localRows =
    childIds.length === 1
      ? await listScreeningsFromLocal(store, { childId: childIds[0] })
      : (await listScreeningsFromLocal(store)).filter((r) => childIds.includes(r.childId))

  if (localRows.length > 0) {
    return {
      measurements: localRows.map(localScreeningToMeasurement),
      assessments: localRows.map(localScreeningToAssessment),
    }
  }

  if (!networkState.getSnapshot().isOnline) {
    return { measurements: [], assessments: [] }
  }

  const syncedChildIds = await filterSyncedChildIds(store, childIds)
  if (syncedChildIds.length === 0) {
    return { measurements: [], assessments: [] }
  }

  try {
    const remote = await fetchScreeningRoster(syncedChildIds)
    await mapScreeningRosterToLocalSeed(store, remote.measurements, remote.assessments)
    return remote
  } catch {
    return { measurements: [], assessments: [] }
  }
}

export function useNutritionHistory(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: nutrition.keys.history(childId ?? ''),
    queryFn: async () => {
      if (!childId) {
        return { childId: '', assessments: [], total: 0 }
      }
      const store = getLocalStore()
      const localRows = await listScreeningsFromLocal(store, { childId })
      if (localRows.length > 0) {
        return {
          childId,
          assessments: localRows.map(localScreeningToAssessment),
          total: localRows.length,
        }
      }
      if (!networkState.getSnapshot().isOnline) {
        return { childId, assessments: [], total: 0 }
      }
      if (await shouldSkipRemoteChildHistory(store, childId)) {
        return { childId, assessments: [], total: 0 }
      }
      try {
        const remote = await fetchNutritionHistory(childId)
        await mapScreeningRosterToLocalSeed(
          store,
          remote.assessments.map((a) => ({
            id: a.id,
            childId: a.childId,
            date: a.date,
            weightKg: a.weightKg ?? 0,
            heightCm: a.heightCm ?? 0,
            muacCm: a.muacCm ?? 0,
            notes: a.notes,
            recordedBy: a.recordedById,
            version: a.version ?? 1,
            nutritionStatus: a.status,
            requiresReferral: a.requiresReferral,
            recordedById: a.recordedById,
          })),
          remote.assessments,
        )
        return remote
      } catch {
        return { childId, assessments: [], total: 0 }
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.nutritionHistory,
    ...localFirstQueryOptions,
  })
}

export function useNutritionLatest(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: nutrition.keys.latest(childId ?? ''),
    queryFn: async () => {
      if (!childId) return undefined
      const store = getLocalStore()
      const localRows = await listScreeningsFromLocal(store, { childId })
      if (localRows.length > 0) {
        return localScreeningToAssessment(localRows[0])
      }
      if (!networkState.getSnapshot().isOnline) return undefined
      if (await shouldSkipRemoteChildHistory(store, childId)) return undefined
      try {
        const history = await fetchNutritionHistory(childId)
        return history.assessments[0]
      } catch {
        return undefined
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.nutritionLatest,
    ...localFirstQueryOptions,
  })
}

/**
 * Shared screening roster query — same cache as Growth measurements.
 * Select assessments for nutrition consumers. LocalStore-first; never MOCK.
 */
export function useNutritionAssessments(childIds: string[], enabled = true) {
  const sortedIds = [...childIds].sort()
  return useQuery({
    queryKey: nutrition.keys.roster(sortedIds),
    queryFn: () => loadRosterFromLocalOrRemote(sortedIds),
    enabled: env.isLive && enabled && sortedIds.length > 0,
    staleTime: queryStaleTimes.nutritionRoster,
    ...localFirstQueryOptions,
    select: (data) => data.assessments,
  })
}

/**
 * Nutrition alerts remain online-only (monitoring-style aggregates).
 * Offline: empty / unavailable — do not fabricate alerts.
 */
export function useNutritionAlerts(filters: NutritionAlertFilters = {}, enabled = true) {
  return useQuery({
    queryKey: nutrition.keys.alerts(filters),
    queryFn: async () => {
      if (!networkState.getSnapshot().isOnline) {
        return { items: [], total: 0 }
      }
      return fetchNutritionAlerts(filters)
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.nutritionAlerts,
    ...localFirstQueryOptions,
  })
}
