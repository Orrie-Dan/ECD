import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { localFirstQueryOptions, sted, queryStaleTimes } from '@/api/query-keys'
import {
  fetchAllChildStedHistory,
  fetchChildStedHistory,
  fetchStedDetail,
  fetchStedRoster,
} from '@/api/resources/sted'
import {
  listStedFromLocal,
  localStedToViewModel,
} from '@/features/sted/local-sted'
import { mapStedRosterToLocalSeed } from '@/features/sted/seed-from-rest'
import { getLocalStore } from '@/storage'
import { networkState } from '@/network/network-state'
import type { StedHistoryFilters, StedAssessmentViewModel } from '@/models/sted'

async function loadRosterFromLocalOrRemote(
  childIds: string[],
): Promise<StedAssessmentViewModel[]> {
  const store = getLocalStore()
  const localRows =
    childIds.length === 1
      ? await listStedFromLocal(store, { childId: childIds[0] })
      : (await listStedFromLocal(store)).filter((r) => childIds.includes(r.childId))

  if (localRows.length > 0) {
    return localRows.map((row) => localStedToViewModel(row))
  }

  if (!networkState.getSnapshot().isOnline) {
    return []
  }

  try {
    const remote = await fetchStedRoster(childIds)
    await mapStedRosterToLocalSeed(store, remote)
    return remote
  } catch {
    return []
  }
}

export function useStedDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sted.keys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return undefined
      const store = getLocalStore()
      const local = await store.getStedAssessment(id)
      if (local && !local.deletedAt && local._localStatus !== 'pending_delete') {
        return localStedToViewModel(local)
      }
      if (!networkState.getSnapshot().isOnline) {
        return undefined
      }
      try {
        const remote = await fetchStedDetail(id)
        await mapStedRosterToLocalSeed(store, [remote])
        return remote
      } catch {
        return undefined
      }
    },
    enabled: env.isLive && enabled && !!id,
    staleTime: queryStaleTimes.stedDetail,
    ...localFirstQueryOptions,
  })
}

export function useChildStedHistory(
  childId: string | undefined,
  filters: StedHistoryFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: sted.keys.history(childId ?? '', filters),
    queryFn: async () => {
      if (!childId) {
        return { childId: '', items: [], total: 0, page: 1, pageSize: 0, totalPages: 1 }
      }
      const store = getLocalStore()
      const localRows = await listStedFromLocal(store, { childId })
      if (localRows.length > 0) {
        const items = localRows.map((row) => localStedToViewModel(row))
        return {
          childId,
          items,
          total: items.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? items.length,
          totalPages: 1,
        }
      }
      if (!networkState.getSnapshot().isOnline) {
        return {
          childId,
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 1,
        }
      }
      try {
        const remote = await fetchChildStedHistory(childId, filters)
        await mapStedRosterToLocalSeed(store, remote.items)
        return remote
      } catch {
        return {
          childId,
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 1,
        }
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.stedHistory,
    ...localFirstQueryOptions,
  })
}

/** Full child history (paginated under the hood when bootstrapping from REST). */
export function useChildStedHistoryWindow(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sted.keys.historyWindow(childId ?? ''),
    queryFn: async () => {
      if (!childId) return []
      const store = getLocalStore()
      const localRows = await listStedFromLocal(store, { childId })
      if (localRows.length > 0) {
        return localRows.map((row) => localStedToViewModel(row))
      }
      if (!networkState.getSnapshot().isOnline) return []
      try {
        const remote = await fetchAllChildStedHistory(childId)
        await mapStedRosterToLocalSeed(store, remote)
        return remote
      } catch {
        return []
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.stedHistory,
    ...localFirstQueryOptions,
  })
}

export function useChildStedLatest(childId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sted.keys.latest(childId ?? ''),
    queryFn: async () => {
      if (!childId) return undefined
      const store = getLocalStore()
      const localRows = await listStedFromLocal(store, { childId })
      if (localRows.length > 0) {
        return localStedToViewModel(localRows[0])
      }
      if (!networkState.getSnapshot().isOnline) return undefined
      try {
        const items = await fetchAllChildStedHistory(childId)
        await mapStedRosterToLocalSeed(store, items)
        return [...items].sort(
          (a, b) =>
            b.assessmentDate.localeCompare(a.assessmentDate) || b.id.localeCompare(a.id),
        )[0]
      } catch {
        return undefined
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.stedLatest,
    ...localFirstQueryOptions,
  })
}

/** Flat multi-child roster for DataProvider-style lists. LocalStore-first; never MOCK. */
export function useStedRoster(childIds: string[], enabled = true) {
  const sortedIds = [...childIds].sort()
  return useQuery({
    queryKey: sted.keys.roster(sortedIds),
    queryFn: () => loadRosterFromLocalOrRemote(sortedIds),
    enabled: env.isLive && enabled && sortedIds.length > 0,
    staleTime: queryStaleTimes.stedRoster,
    ...localFirstQueryOptions,
  })
}
