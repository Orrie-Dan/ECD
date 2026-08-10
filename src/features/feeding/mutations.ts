import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { feeding, monitoring } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth'
import {
  upsertFeedingDayLocalFirst,
  upsertFeedingMonthSummaryLocalFirst,
} from '@/features/feeding/local-feeding'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import type {
  FeedingDayUpsertInput,
  FeedingMonthSummaryUpsertInput,
} from '@/models/feeding'

/**
 * Invalidate feeding caches after a write.
 * Day upserts affect day windows (and derived month day-counts in the UI).
 * Summary upserts affect summary windows only — day counts are not stored on summaries.
 * Monitoring remains online-only; invalidate so reconnecting sessions refresh aggregates.
 */
export async function invalidateFeedingQueries(
  queryClient: QueryClient,
  options?: { centerId?: string; scope?: 'days' | 'summaries' | 'all' },
) {
  const scope = options?.scope ?? 'all'
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: monitoring.keys.all }),
  ]

  if (scope === 'all') {
    tasks.push(queryClient.invalidateQueries({ queryKey: feeding.keys.all }))
  } else if (scope === 'days') {
    tasks.push(queryClient.invalidateQueries({ queryKey: feeding.keys.all }))
    if (options?.centerId) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: feeding.keys.daysWindow(options.centerId),
        }),
        queryClient.invalidateQueries({
          queryKey: feeding.keys.center(options.centerId),
        }),
      )
    }
  } else if (scope === 'summaries') {
    tasks.push(queryClient.invalidateQueries({ queryKey: feeding.keys.all }))
    if (options?.centerId) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: feeding.keys.summariesWindow(options.centerId),
        }),
        queryClient.invalidateQueries({
          queryKey: feeding.keys.center(options.centerId),
        }),
      )
    }
  }

  await Promise.all(tasks)
}

/** Local-first day upsert — same path as Feeding repository (not direct REST). */
export function useUpsertFeedingDay() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  return useMutation({
    mutationFn: async (input: FeedingDayUpsertInput) => {
      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to record feeding')
      }
      const store = getLocalStore()
      const result = await upsertFeedingDayLocalFirst(store, {
        ...input,
        recordedById,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return result.record
    },
    onSuccess: (data) => {
      void invalidateFeedingQueries(queryClient, {
        centerId: data.centerId,
        scope: 'days',
      })
    },
  })
}

/** Local-first month summary upsert — same path as Feeding repository. */
export function useUpsertFeedingMonthSummary() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  return useMutation({
    mutationFn: async (input: FeedingMonthSummaryUpsertInput) => {
      const updatedById = user?.id
      if (!updatedById) {
        throw new Error('authenticated user id is required to record feeding summary')
      }
      const store = getLocalStore()
      const result = await upsertFeedingMonthSummaryLocalFirst(store, {
        ...input,
        updatedById,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return result.record
    },
    onSuccess: (data) => {
      void invalidateFeedingQueries(queryClient, {
        centerId: data.centerId,
        scope: 'summaries',
      })
    },
  })
}
