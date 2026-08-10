import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { referrals, queryStaleTimes } from '@/api/query-keys'
import {
  fetchAllReferrals,
  fetchChildReferralHistory,
  fetchReferralList,
} from '@/api/resources/referrals'
import {
  listReferralsFromLocal,
  localReferralToViewModel,
} from '@/features/referrals/local-referrals'
import { mapReferralListToLocalSeed } from '@/features/referrals/seed-from-rest'
import { getLocalStore } from '@/storage'
import type { ReferralListFilters, ReferralViewModel } from '@/models/referral'
import { networkState } from '@/network/network-state'

async function loadListFromLocalOrRemote(
  filters: ReferralListFilters,
): Promise<{
  items: ReferralViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const store = getLocalStore()
  let localRows = await listReferralsFromLocal(store, {
    centerId: filters.centerId,
    childId: filters.childId,
  })

  if (filters.sourceType) {
    localRows = localRows.filter((r) => r.sourceType === filters.sourceType)
  }
  if (filters.status) {
    localRows = localRows.filter((r) => r.status === filters.status)
  }

  if (localRows.length > 0) {
    const items = localRows.map(localReferralToViewModel)
    return {
      items,
      total: items.length,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? items.length,
      totalPages: 1,
    }
  }

  if (!networkState.getSnapshot().isOnline) {
    return {
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
      totalPages: 1,
    }
  }

  try {
    const remote = await fetchReferralList(filters)
    await mapReferralListToLocalSeed(store, remote.items)
    return remote
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: filters.pageSize ?? 50,
      totalPages: 1,
    }
  }
}

async function loadWindowFromLocalOrRemote(
  filters: Omit<ReferralListFilters, 'page' | 'pageSize'> = {},
): Promise<ReferralViewModel[]> {
  const store = getLocalStore()
  let localRows = await listReferralsFromLocal(store, {
    centerId: filters.centerId,
    childId: filters.childId,
  })

  if (filters.sourceType) {
    localRows = localRows.filter((r) => r.sourceType === filters.sourceType)
  }
  if (filters.status) {
    localRows = localRows.filter((r) => r.status === filters.status)
  }

  if (localRows.length > 0) {
    return localRows.map(localReferralToViewModel)
  }

  if (!networkState.getSnapshot().isOnline) {
    return []
  }

  try {
    const remote = await fetchAllReferrals(filters)
    await mapReferralListToLocalSeed(store, remote)
    return remote
  } catch {
    return []
  }
}

export function useReferralList(filters: ReferralListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: referrals.keys.list(filters),
    queryFn: () => loadListFromLocalOrRemote(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.referralList,
  })
}

/** Full list window (paginated under the hood when bootstrapping from REST). */
export function useReferralWindow(
  filters: Omit<ReferralListFilters, 'page' | 'pageSize'> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: referrals.keys.window(filters),
    queryFn: () => loadWindowFromLocalOrRemote(filters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.referralWindow,
  })
}

export function useChildReferralHistory(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: referrals.keys.history(childId ?? ''),
    queryFn: async () => {
      if (!childId) return { childId: '', items: [], total: 0 }
      const store = getLocalStore()
      const localRows = await listReferralsFromLocal(store, { childId })
      if (localRows.length > 0) {
        const items = localRows.map(localReferralToViewModel)
        return { childId, items, total: items.length }
      }
      if (!networkState.getSnapshot().isOnline) {
        return { childId, items: [], total: 0 }
      }
      try {
        const remote = await fetchChildReferralHistory(childId)
        await mapReferralListToLocalSeed(store, remote.items)
        return remote
      } catch {
        return { childId, items: [], total: 0 }
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.referralHistory,
  })
}
