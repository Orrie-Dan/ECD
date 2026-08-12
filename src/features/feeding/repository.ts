import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import {
  asFeedingDayViewModel,
  asFeedingMonthSummaryViewModel,
} from '@/api/mappers/feeding.mapper'
import {
  useFeedingDaysWindow,
  useFeedingSummariesWindow,
} from '@/features/feeding/queries'
import { invalidateFeedingQueries } from '@/features/feeding/mutations'
import {
  upsertFeedingDayLocalFirst,
  upsertFeedingMonthSummaryLocalFirst,
} from '@/features/feeding/local-feeding'
import { isCaretaker } from '@/api/roles'
import { isBalancedComposition } from '@/lib/feeding-utils'
import { MOCK_FEEDING_DAYS, MOCK_FEEDING_SUMMARIES } from '@/lib/mock-data'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { assertLiveApiWritesAvailable } from '@/lib/live-api-guard'
import type {
  FeedingDayUpsertInput,
  FeedingMonthSummaryUpsertInput,
} from '@/models/feeding'
import type {
  CenterFeedingDay,
  CenterFeedingMonthSummary,
  User,
} from '@/types'

/**
 * Mode-aware feeding data access used by DataProvider.
 * MOCK → in-memory mock lists (unchanged).
 * LIVE → LocalStore durable reads/writes + outbox; React Query is UI projection.
 * Never falls back to MOCK_FEEDING_* when LIVE (online or offline).
 *
 * REST delete is unsupported — no offline delete is exposed.
 * District multi-center monitoring remains online-only via monitoring APIs.
 */
export function useFeedingRepository(user: User | null) {
  const queryClient = useQueryClient()
  const [mockDays, setMockDays] = useState<CenterFeedingDay[]>(MOCK_FEEDING_DAYS)
  const [mockSummaries, setMockSummaries] =
    useState<CenterFeedingMonthSummary[]>(MOCK_FEEDING_SUMMARIES)

  const centerId = isCaretaker(user) ? user?.centerId : undefined

  const daysQuery = useFeedingDaysWindow(centerId, env.isLive && !!centerId)
  const summariesQuery = useFeedingSummariesWindow(centerId, env.isLive && !!centerId)

  const feedingDays: CenterFeedingDay[] = useMemo(() => {
    if (!env.isLive) return mockDays
    return daysQuery.data ?? []
  }, [daysQuery.data, mockDays])

  const feedingSummaries: CenterFeedingMonthSummary[] = useMemo(() => {
    if (!env.isLive) return mockSummaries
    return summariesQuery.data ?? []
  }, [mockSummaries, summariesQuery.data])

  const feedingLoading =
    env.isLive && !!centerId && (daysQuery.isLoading || summariesQuery.isLoading)
  const feedingError =
    env.isLive && !!centerId && (daysQuery.isError || summariesQuery.isError)

  const findCachedDay = useCallback(
    (cId: string, date: string) => {
      const found = feedingDays.find((d) => d.centerId === cId && d.date === date)
      return found ? asFeedingDayViewModel(found) : undefined
    },
    [feedingDays],
  )

  const findCachedSummary = useCallback(
    (cId: string, yearMonth: string) => {
      const found = feedingSummaries.find(
        (s) => s.centerId === cId && s.yearMonth === yearMonth,
      )
      return found ? asFeedingMonthSummaryViewModel(found) : undefined
    },
    [feedingSummaries],
  )

  const upsertFeedingDay = useCallback(
    async (input: FeedingDayUpsertInput): Promise<CenterFeedingDay> => {
      assertLiveApiWritesAvailable()
      const nextBalanced = input.balancedMealServed
        ? isBalancedComposition(input.composition)
        : false

      if (env.isMock) {
        let result: CenterFeedingDay = {
          id: `fd${Date.now()}`,
          centerId: input.centerId,
          date: input.date,
          milkServed: input.milkServed,
          porridgeServed: input.porridgeServed,
          balancedMealServed: nextBalanced,
          composition: nextBalanced ? input.composition : undefined,
          recordedBy: input.recordedBy,
        }

        setMockDays((prev) => {
          const without = prev.filter(
            (d) => !(d.centerId === input.centerId && d.date === input.date),
          )
          const existing = prev.find(
            (d) => d.centerId === input.centerId && d.date === input.date,
          )
          if (existing) {
            result = {
              ...existing,
              milkServed: input.milkServed,
              porridgeServed: input.porridgeServed,
              balancedMealServed: nextBalanced,
              composition: nextBalanced ? input.composition : undefined,
              recordedBy: input.recordedBy ?? existing.recordedBy,
            }
            return [...without, result]
          }
          return [...without, result]
        })
        return result
      }

      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to record feeding')
      }

      const store = getLocalStore()
      const existing = findCachedDay(input.centerId, input.date)
      const result = await upsertFeedingDayLocalFirst(store, {
        ...input,
        balancedMealServed: nextBalanced,
        composition: nextBalanced ? input.composition : undefined,
        recordedById,
        version: input.version ?? existing?.version,
      })

      await invalidateFeedingQueries(queryClient, {
        centerId: input.centerId,
        scope: 'days',
      })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      // Preserve display name for same-session UX (recordedById is the sync UUID).
      return {
        ...result.record,
        recordedBy: input.recordedBy ?? result.record.recordedBy,
      }
    },
    [findCachedDay, queryClient, user?.id],
  )

  const upsertFeedingMonthSummary = useCallback(
    async (
      input: FeedingMonthSummaryUpsertInput,
    ): Promise<CenterFeedingMonthSummary> => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        let result: CenterFeedingMonthSummary = {
          id: `fs${Date.now()}`,
          centerId: input.centerId,
          yearMonth: input.yearMonth,
          milkLiters: input.milkLiters,
          flourKg: input.flourKg,
          foodSource: input.foodSource.trim(),
          updatedAt: new Date().toISOString().split('T')[0],
          updatedBy: input.updatedBy,
        }

        setMockSummaries((prev) => {
          const without = prev.filter(
            (s) => !(s.centerId === input.centerId && s.yearMonth === input.yearMonth),
          )
          const existing = prev.find(
            (s) => s.centerId === input.centerId && s.yearMonth === input.yearMonth,
          )
          if (existing) {
            result = {
              ...existing,
              milkLiters: input.milkLiters,
              flourKg: input.flourKg,
              foodSource: input.foodSource.trim(),
              updatedAt: result.updatedAt,
              updatedBy: input.updatedBy,
            }
            return [...without, result]
          }
          return [...without, result]
        })
        return result
      }

      const updatedById = user?.id
      if (!updatedById) {
        throw new Error('authenticated user id is required to record feeding summary')
      }

      const store = getLocalStore()
      const existing = findCachedSummary(input.centerId, input.yearMonth)
      const result = await upsertFeedingMonthSummaryLocalFirst(store, {
        ...input,
        foodSource: input.foodSource.trim(),
        updatedById,
        version: input.version ?? existing?.version,
      })

      await invalidateFeedingQueries(queryClient, {
        centerId: input.centerId,
        scope: 'summaries',
      })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return {
        ...result.record,
        updatedBy: input.updatedBy ?? result.record.updatedBy,
      }
    },
    [findCachedSummary, queryClient, user?.id],
  )

  const getFeedingDay = useCallback(
    (cId: string, date: string) =>
      feedingDays.find((d) => d.centerId === cId && d.date === date),
    [feedingDays],
  )

  const getFeedingMonthSummary = useCallback(
    (cId: string, yearMonth: string) =>
      feedingSummaries.find((s) => s.centerId === cId && s.yearMonth === yearMonth),
    [feedingSummaries],
  )

  return {
    feedingDays,
    feedingSummaries,
    feedingLoading,
    feedingError,
    upsertFeedingDay,
    upsertFeedingMonthSummary,
    getFeedingDay,
    getFeedingMonthSummary,
  }
}
