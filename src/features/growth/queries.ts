import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { growth, localFirstQueryOptions, nutrition, queryStaleTimes } from '@/api/query-keys'
import {
  fetchChildGrowthChart,
  fetchChildGrowthHistory,
  fetchGrowthRoster,
} from '@/api/resources/growth'
import {
  listScreeningsFromLocal,
  localScreeningToAssessment,
  localScreeningToMeasurement,
} from '@/features/nutrition/local-screenings'
import { mapScreeningRosterToLocalSeed } from '@/features/nutrition/seed-from-rest'
import { getLocalStore } from '@/storage'
import { networkState } from '@/network/network-state'
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

  try {
    const remote = await fetchGrowthRoster(childIds)
    await mapScreeningRosterToLocalSeed(store, remote.measurements, remote.assessments)
    return remote
  } catch {
    return { measurements: [], assessments: [] }
  }
}

export function useChildGrowthHistory(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: growth.keys.history(childId ?? ''),
    queryFn: async () => {
      if (!childId) {
        return { childId: '', measurements: [], assessments: [], total: 0 }
      }
      const store = getLocalStore()
      const localRows = await listScreeningsFromLocal(store, { childId })
      if (localRows.length > 0) {
        return {
          childId,
          measurements: localRows.map(localScreeningToMeasurement),
          assessments: localRows.map(localScreeningToAssessment),
          total: localRows.length,
        }
      }
      if (!networkState.getSnapshot().isOnline) {
        return { childId, measurements: [], assessments: [], total: 0 }
      }
      try {
        const remote = await fetchChildGrowthHistory(childId)
        await mapScreeningRosterToLocalSeed(
          store,
          remote.measurements,
          remote.assessments,
        )
        return remote
      } catch {
        return { childId, measurements: [], assessments: [], total: 0 }
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.growthHistory,
    ...localFirstQueryOptions,
  })
}

export function useChildGrowthLatest(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: growth.keys.latest(childId ?? ''),
    queryFn: async () => {
      if (!childId) return undefined
      const store = getLocalStore()
      const localRows = await listScreeningsFromLocal(store, { childId })
      if (localRows.length > 0) {
        return localScreeningToMeasurement(localRows[0])
      }
      if (!networkState.getSnapshot().isOnline) return undefined
      try {
        const history = await fetchChildGrowthHistory(childId)
        await mapScreeningRosterToLocalSeed(
          store,
          history.measurements,
          history.assessments,
        )
        return history.measurements[0]
      } catch {
        return undefined
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.growthLatest,
    ...localFirstQueryOptions,
  })
}

/**
 * Growth chart remains online-only (derived series from API).
 * Offline: unavailable (empty) — do not fabricate chart points.
 */
export function useChildGrowthChart(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: growth.keys.chart(childId ?? ''),
    queryFn: async () => {
      if (!childId) {
        return {
          childId: '',
          weight: [],
          muac: [],
          height: [],
          headCircumference: [],
        }
      }
      if (!networkState.getSnapshot().isOnline) {
        return {
          childId,
          weight: [],
          muac: [],
          height: [],
          headCircumference: [],
        }
      }
      return fetchChildGrowthChart(childId)
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.growthChart,
    ...localFirstQueryOptions,
  })
}

/**
 * Flat measurement roster — shares cache with Nutrition assessments via nutrition.keys.roster.
 * LIVE: LocalStore first; REST bootstrap when empty + online. Never MOCK.
 */
export function useGrowthRoster(childIds: string[], enabled = true) {
  const sortedIds = [...childIds].sort()
  return useQuery({
    queryKey: nutrition.keys.roster(sortedIds),
    queryFn: () => loadRosterFromLocalOrRemote(sortedIds),
    enabled: env.isLive && enabled && sortedIds.length > 0,
    staleTime: queryStaleTimes.growthRoster,
    ...localFirstQueryOptions,
    select: (data) => data.measurements,
  })
}
