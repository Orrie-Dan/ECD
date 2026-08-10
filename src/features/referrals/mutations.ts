import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { referrals } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth'
import {
  createReferralLocalFirst,
  updateReferralStatusLocalFirst,
} from '@/features/referrals/local-referrals'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import type { ReferralCreateInput, ReferralStatusUpdateInput } from '@/models/referral'

/**
 * Invalidate referral caches after local create / status transition / pull.
 * Does not invalidate growth/nutrition/sted — those source records are unchanged.
 */
export async function invalidateReferralQueries(
  queryClient: QueryClient,
  options?: { childId?: string },
) {
  const tasks = [queryClient.invalidateQueries({ queryKey: referrals.keys.all })]
  if (options?.childId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: referrals.keys.child(options.childId),
      }),
      queryClient.invalidateQueries({
        queryKey: referrals.keys.history(options.childId),
      }),
    )
  }
  await Promise.all(tasks)
}

/** Local-first create — same path as referral repository (not direct REST). */
export function useCreateReferral() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  return useMutation({
    mutationFn: async (input: ReferralCreateInput) => {
      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to create a referral')
      }
      const store = getLocalStore()
      const centerId =
        input.centerId || user.centerId || (await store.getChild(input.childId))?.centerId
      if (!centerId) {
        throw new Error('centerId is required to create a referral')
      }
      const result = await createReferralLocalFirst(store, {
        ...input,
        centerId,
        recordedById,
        deviceId: tokenStorage.getDeviceId() ?? undefined,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return result.referral
    },
    onSuccess: (data) => {
      void invalidateReferralQueries(queryClient, { childId: data.childId })
    },
  })
}

/** Local-first terminal status update — CAS version via outbox UPDATE. */
export function useUpdateReferralStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReferralStatusUpdateInput) => {
      const store = getLocalStore()
      const result = await updateReferralStatusLocalFirst(store, {
        id: input.id,
        status: input.status,
        implementedAt: input.implementedAt,
        notes: input.notes,
        deviceId: tokenStorage.getDeviceId() ?? undefined,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return result.referral
    },
    onSuccess: (data) => {
      void invalidateReferralQueries(queryClient, { childId: data.childId })
    },
  })
}
