import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { normalizeApiError } from '@/api/errors'
import { isEcdCenterUser } from '@/api/roles'
import { asReferralViewModel } from '@/api/mappers/referral.mapper'
import { useReferralWindow } from '@/features/referrals/queries'
import { invalidateReferralQueries } from '@/features/referrals/mutations'
import {
  createReferralLocalFirst,
  patchReferralLocalFirst,
  updateReferralStatusLocalFirst,
} from '@/features/referrals/local-referrals'
import { DEFAULT_CENTER_ID, MOCK_REFERRALS } from '@/lib/mock-data'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { assertLiveApiWritesAvailable } from '@/lib/live-api-guard'
import { tokenStorage } from '@/api/token-storage'
import type {
  ReferralCreateInput,
  ReferralPatchInput,
  ReferralViewModel,
} from '@/models/referral'
import type { Child, Referral, ReferralStatus, User } from '@/types'

/**
 * Mode-aware referral data access used by DataProvider.
 * MOCK → MOCK_REFERRALS + in-memory writes.
 * LIVE → LocalStore + outbox (create / status / notes). Never MOCK fallback.
 *
 * Nutrition/STED dependency creates remain in their local-first modules.
 * Standalone create dedupes by sourceId so those records are not duplicated.
 *
 * Field honesty:
 * - SERVER_PERSISTED: status, notes, implementedAt, reason, destination, …
 * - DERIVED: assessmentId ↔ sourceId
 */
export function useReferralRepository(user: User | null, children: Child[]) {
  const queryClient = useQueryClient()
  const [mockReferrals, setMockReferrals] = useState<Referral[]>(MOCK_REFERRALS)

  const windowFilters = useMemo(
    () => ({
      centerId: isEcdCenterUser(user) ? user?.centerId : undefined,
    }),
    [user],
  )

  // District LIVE must not pull district-wide referral windows into LocalStore.
  const liveQuery = useReferralWindow(
    windowFilters,
    env.isLive && !!user && isEcdCenterUser(user),
  )

  const childCenterMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const child of children) {
      map.set(child.id, child.centerId)
    }
    return map
  }, [children])

  const referrals: ReferralViewModel[] = useMemo(() => {
    if (!env.isLive) {
      return mockReferrals.map((r) =>
        asReferralViewModel(
          {
            ...r,
            centerId: childCenterMap.get(r.childId) ?? DEFAULT_CENTER_ID,
            version: 0,
          },
          DEFAULT_CENTER_ID,
        ),
      )
    }
    return liveQuery.data ?? []
  }, [childCenterMap, liveQuery.data, mockReferrals])

  const referralsLoading = env.isLive && !!user && liveQuery.isLoading
  const referralsError = env.isLive && !!user && liveQuery.isError

  const resolveCenterId = useCallback(
    (childId: string, explicit?: string) =>
      explicit ?? childCenterMap.get(childId) ?? user?.centerId,
    [childCenterMap, user?.centerId],
  )

  const createReferral = useCallback(
    async (input: ReferralCreateInput | Omit<Referral, 'id'>): Promise<ReferralViewModel> => {
      assertLiveApiWritesAvailable()
      const assessmentId = input.assessmentId

      if (env.isMock) {
        const existing = mockReferrals.find(
          (r) =>
            r.childId === input.childId &&
            r.assessmentId === assessmentId &&
            r.status === 'pending',
        )
        if (existing) {
          return asReferralViewModel({
            ...existing,
            centerId: resolveCenterId(existing.childId),
            version: 0,
          })
        }
        const next: ReferralViewModel = asReferralViewModel({
          ...input,
          id: `ref${Date.now()}`,
          assessmentId,
          centerId: resolveCenterId(input.childId, (input as ReferralCreateInput).centerId),
          version: 0,
          status: input.status ?? 'pending',
        })
        setMockReferrals((prev) => [...prev, next])
        return next
      }

      const recordedById = user?.id
      if (!recordedById) {
        throw normalizeApiError(new Error('authenticated user id is required to create a referral'))
      }

      const centerId = resolveCenterId(input.childId, (input as ReferralCreateInput).centerId)
      if (!centerId) {
        throw normalizeApiError(new Error('centerId is required to create a referral'))
      }

      const store = getLocalStore()
      const result = await createReferralLocalFirst(store, {
        childId: input.childId,
        centerId,
        assessmentId,
        sourceType: input.sourceType,
        date: input.date,
        reason: input.reason,
        destination: input.destination,
        notes: input.notes,
        recordedById,
        deviceId: tokenStorage.getDeviceId() ?? undefined,
      })

      await invalidateReferralQueries(queryClient, { childId: result.referral.childId })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return result.referral
    },
    [mockReferrals, queryClient, resolveCenterId, user?.id],
  )

  const updateReferralStatus = useCallback(
    async (
      id: string,
      status: ReferralStatus,
      extras?: { implementedAt?: string; notes?: string },
    ): Promise<ReferralViewModel> => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        let updated: ReferralViewModel | undefined
        setMockReferrals((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r
            const next = {
              ...r,
              status,
              implementedAt:
                status === 'completed'
                  ? extras?.implementedAt ?? new Date().toISOString().split('T')[0]
                  : extras?.implementedAt ?? r.implementedAt,
              notes: extras?.notes !== undefined ? extras.notes : r.notes,
            }
            updated = asReferralViewModel({
              ...next,
              centerId: resolveCenterId(r.childId),
              version: 0,
            })
            return next
          }),
        )
        if (!updated) {
          throw normalizeApiError(new Error(`Referral not found: ${id}`))
        }
        return updated
      }

      if (status !== 'completed' && status !== 'cancelled') {
        throw normalizeApiError(
          new Error('Referral status update supports only completed or cancelled'),
        )
      }

      const store = getLocalStore()
      try {
        const result = await updateReferralStatusLocalFirst(store, {
          id,
          status,
          implementedAt: extras?.implementedAt,
          notes: extras?.notes,
          deviceId: tokenStorage.getDeviceId() ?? undefined,
        })
        await invalidateReferralQueries(queryClient, { childId: result.referral.childId })
        if (networkState.getSnapshot().isOnline) {
          void getSyncEngine().syncNow()
        }
        return result.referral
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    [queryClient, resolveCenterId],
  )

  const updateReferral = useCallback(
    async (id: string, patch: ReferralPatchInput): Promise<ReferralViewModel> => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        let updated: ReferralViewModel | undefined
        setMockReferrals((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r
            const nextStatus = patch.status ?? r.status
            const next = {
              ...r,
              status: nextStatus,
              implementedAt:
                patch.implementedAt !== undefined
                  ? patch.implementedAt
                  : nextStatus === 'completed' && !r.implementedAt
                    ? new Date().toISOString().split('T')[0]
                    : r.implementedAt,
              notes: patch.notes !== undefined ? patch.notes : r.notes,
            }
            updated = asReferralViewModel({
              ...next,
              centerId: resolveCenterId(r.childId),
              version: 0,
            })
            return next
          }),
        )
        if (!updated) {
          throw normalizeApiError(new Error(`Referral not found: ${id}`))
        }
        return updated
      }

      const store = getLocalStore()
      try {
        const result = await patchReferralLocalFirst(store, id, {
          ...patch,
          deviceId: tokenStorage.getDeviceId() ?? undefined,
        })
        await invalidateReferralQueries(queryClient, { childId: result.referral.childId })
        if (networkState.getSnapshot().isOnline) {
          void getSyncEngine().syncNow()
        }
        return result.referral
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    [queryClient, resolveCenterId],
  )

  const getChildReferrals = useCallback(
    (childId: string) => referrals.filter((r) => r.childId === childId),
    [referrals],
  )

  return {
    referrals,
    referralsLoading,
    referralsError,
    createReferral,
    updateReferralStatus,
    updateReferral,
    getChildReferrals,
  }
}
