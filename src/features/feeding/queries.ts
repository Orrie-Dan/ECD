import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { feeding, localFirstQueryOptions, queryStaleTimes } from '@/api/query-keys'
import {
  fetchAllFeedingDays,
  fetchAllFeedingMonthSummaries,
  fetchFeedingDayList,
  fetchFeedingMonthSummaryList,
} from '@/api/resources/feeding'
import {
  listFeedingDaysFromLocal,
  listFeedingMonthSummariesFromLocal,
} from '@/features/feeding/local-feeding'
import {
  mapFeedingDayListToLocalSeed,
  mapFeedingMonthSummaryListToLocalSeed,
} from '@/features/feeding/seed-from-rest'
import { getLocalStore } from '@/storage'
import { networkState } from '@/network/network-state'
import type {
  FeedingDayListFilters,
  FeedingMonthSummaryListFilters,
} from '@/models/feeding'

/**
 * LIVE feeding day list hydrates from LocalStore (durable).
 * Falls back to REST only when the local snapshot is empty (pre-first-sync).
 * Never falls back to MOCK_FEEDING_DAYS.
 */
export function useFeedingDayList(filters: FeedingDayListFilters, enabled = true) {
  return useQuery({
    queryKey: feeding.keys.days(filters),
    queryFn: async () => {
      const store = getLocalStore()
      const localItems = await listFeedingDaysFromLocal(store, {
        centerId: filters.centerId,
        yearMonth: filters.yearMonth,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      if (localItems.length > 0) {
        return {
          items: localItems,
          total: localItems.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? localItems.length,
          totalPages: 1,
        }
      }

      if (!networkState.getSnapshot().isOnline) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }

      try {
        const remote = await fetchFeedingDayList(filters)
        await mapFeedingDayListToLocalSeed(store, remote.items)
        return remote
      } catch {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }
    },
    enabled: env.isLive && enabled && !!filters.centerId,
    staleTime: queryStaleTimes.feedingDays,
    ...localFirstQueryOptions,
  })
}

/** Full center day history — LocalStore first; REST bootstrap when empty + online. */
export function useFeedingDaysWindow(centerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: feeding.keys.daysWindow(centerId ?? ''),
    queryFn: async () => {
      if (!centerId) return []
      const store = getLocalStore()
      const localItems = await listFeedingDaysFromLocal(store, { centerId })
      if (localItems.length > 0) return localItems

      if (!networkState.getSnapshot().isOnline) return []

      try {
        const remote = await fetchAllFeedingDays({ centerId })
        await mapFeedingDayListToLocalSeed(store, remote)
        return remote
      } catch {
        return []
      }
    },
    enabled: env.isLive && enabled && !!centerId,
    staleTime: queryStaleTimes.feedingDays,
    ...localFirstQueryOptions,
  })
}

export function useFeedingMonthSummaryList(
  filters: FeedingMonthSummaryListFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: feeding.keys.summaries(filters),
    queryFn: async () => {
      const store = getLocalStore()
      const localItems = await listFeedingMonthSummariesFromLocal(store, {
        centerId: filters.centerId,
        yearMonth: filters.yearMonth,
      })
      if (localItems.length > 0) {
        return {
          items: localItems,
          total: localItems.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? localItems.length,
          totalPages: 1,
        }
      }

      if (!networkState.getSnapshot().isOnline) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }

      try {
        const remote = await fetchFeedingMonthSummaryList(filters)
        await mapFeedingMonthSummaryListToLocalSeed(store, remote.items)
        return remote
      } catch {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }
    },
    enabled: env.isLive && enabled && !!filters.centerId,
    staleTime: queryStaleTimes.feedingSummaries,
    ...localFirstQueryOptions,
  })
}

/** Full center month-summary history — LocalStore first; REST bootstrap when empty + online. */
export function useFeedingSummariesWindow(centerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: feeding.keys.summariesWindow(centerId ?? ''),
    queryFn: async () => {
      if (!centerId) return []
      const store = getLocalStore()
      const localItems = await listFeedingMonthSummariesFromLocal(store, { centerId })
      if (localItems.length > 0) return localItems

      if (!networkState.getSnapshot().isOnline) return []

      try {
        const remote = await fetchAllFeedingMonthSummaries({ centerId })
        await mapFeedingMonthSummaryListToLocalSeed(store, remote)
        return remote
      } catch {
        return []
      }
    },
    enabled: env.isLive && enabled && !!centerId,
    staleTime: queryStaleTimes.feedingSummaries,
    ...localFirstQueryOptions,
  })
}
