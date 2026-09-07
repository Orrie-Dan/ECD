import type { LocalStore } from '@/storage/local-store'
import type { LocalChildRecord } from '@/storage/types'

const ACTIVE_CREATE_STATUSES = ['pending', 'blocked', 'syncing'] as const

/** Client UUID exists locally but has not been applied on the server yet. */
export function isLocalChildUnsyncedOnServer(child: LocalChildRecord): boolean {
  if (child.deletedAt) return false
  return child.version === 0 && child._localStatus === 'dirty'
}

/**
 * Child IDs that must not hit REST child-scoped routes (history, transfers, etc.).
 * Merges durable local state with active child-create outbox rows.
 */
export async function listUnsyncedChildIds(
  store: LocalStore,
  childIds: string[],
): Promise<Set<string>> {
  const unsynced = new Set<string>()
  if (childIds.length === 0) return unsynced

  const wanted = new Set(childIds)
  for (const id of childIds) {
    const child = await store.getChild(id)
    if (child && isLocalChildUnsyncedOnServer(child)) {
      unsynced.add(id)
    }
  }

  const ops = await store.listOperations({ status: [...ACTIVE_CREATE_STATUSES] })
  for (const op of ops) {
    if (
      op.entityType === 'child' &&
      op.operation === 'create' &&
      wanted.has(op.entityId)
    ) {
      unsynced.add(op.entityId)
    }
  }

  return unsynced
}

export async function filterSyncedChildIds(
  store: LocalStore,
  childIds: string[],
): Promise<string[]> {
  const unsynced = await listUnsyncedChildIds(store, childIds)
  return childIds.filter((id) => !unsynced.has(id))
}

export async function shouldSkipRemoteChildHistory(
  store: LocalStore,
  childId: string,
): Promise<boolean> {
  const unsynced = await listUnsyncedChildIds(store, [childId])
  return unsynced.has(childId)
}
