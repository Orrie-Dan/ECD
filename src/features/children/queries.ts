import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { children, queryStaleTimes } from '@/api/query-keys'
import { fetchChildDetail, fetchChildrenList } from '@/api/resources/children'
import { getLocalStore } from '@/storage'
import { META_KEYS } from '@/storage/types'
import { listChildrenFromLocal, localChildToViewModel } from '@/features/children/local-children'
import { mapChildListItemToLocalSeed } from '@/features/children/seed-from-rest'
import { networkState } from '@/network/network-state'
import type { ChildrenListFilters, ChildrenListResult } from '@/models/child'

export type ChildrenListQueryResult = ChildrenListResult & {
  /** True when LocalStore has no rows and REST bootstrap was unavailable (offline / error). */
  needsOnlineBootstrap?: boolean
}

/**
 * LIVE children list hydrates from LocalStore (durable).
 * Falls back to REST only when the local snapshot is empty (pre-first-sync).
 * Never invents MOCK data when offline without a snapshot.
 */
export function useChildrenList(filters: ChildrenListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: children.keys.list(filters),
    queryFn: async (): Promise<ChildrenListQueryResult> => {
      const store = getLocalStore()
      const localItems = await listChildrenFromLocal(store, filters.centerId)
      if (localItems.length > 0) {
        return {
          items: localItems,
          total: localItems.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? localItems.length,
          totalPages: 1,
        }
      }

      const hasSnapshot = (await store.getMeta(META_KEYS.hasLocalSnapshot)) === 'true'
      const online = networkState.getSnapshot().status !== 'OFFLINE'

      if (!online) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 100,
          totalPages: 0,
          needsOnlineBootstrap: !hasSnapshot,
        }
      }

      try {
        const remote = await fetchChildrenList(filters)
        await mapChildListItemToLocalSeed(store, remote.items)
        if (remote.items.length > 0) {
          await store.setMeta(META_KEYS.hasLocalSnapshot, 'true')
        }
        return remote
      } catch {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 100,
          totalPages: 0,
          needsOnlineBootstrap: !hasSnapshot,
        }
      }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.childrenList,
  })
}

export function useChildDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: children.keys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('Child id required')
      const local = await getLocalStore().getChild(id)
      if (local && !local.deletedAt) {
        return localChildToViewModel(local)
      }
      return fetchChildDetail(id)
    },
    enabled: env.isLive && enabled && !!id,
    staleTime: queryStaleTimes.childrenDetail,
  })
}
