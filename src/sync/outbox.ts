import type { LocalStore } from '@/storage/local-store'
import type { OutboxStatus, SyncOperationRecord } from '@/storage/types'
import { getActiveOwnerUserId } from '@/storage/ownership'

/**
 * Outbox readiness: an op is ready when every dependency is applied.
 */
export function isOperationReady(
  op: SyncOperationRecord,
  byId: Map<string, SyncOperationRecord>,
): boolean {
  if (op.status === 'applied' || op.status === 'syncing') return false
  if (op.status === 'conflict' || op.status === 'failed') return false
  // pending or blocked: ready when all deps are applied (or no deps).
  return (op.dependsOn ?? []).every((depId) => byId.get(depId)?.status === 'applied')
}

export async function refreshBlockedOperations(
  store: LocalStore,
  ownerUserId?: string,
): Promise<void> {
  const owner = ownerUserId ?? getActiveOwnerUserId() ?? undefined
  const all = await store.listOperations({
    ownerUserId: owner,
    includeAllOwners: !owner,
  })
  const byId = new Map(all.map((op) => [op.clientOperationId, op]))

  for (const op of all) {
    if (op.status !== 'pending' && op.status !== 'blocked') continue
    const ready = isOperationReady({ ...op, status: 'pending' }, byId)
    if (ready && op.status === 'blocked') {
      await store.updateOperation(op.clientOperationId, {
        status: 'pending',
        lastError: undefined,
      })
    } else if (!ready && op.status === 'pending') {
      await store.updateOperation(op.clientOperationId, {
        status: 'blocked',
        lastError: 'Waiting for dependency operations',
      })
    }
  }
}

export interface SelectPushBatchOptions {
  max?: number
  /**
   * Hard ownership guard — only this user's operations may be selected.
   * Required for production sync; never omit under a live authenticated session.
   */
  ownerUserId: string
}

/** Ready pending ops in createdAt order, capped at max — owner-scoped. */
export async function selectPushBatch(
  store: LocalStore,
  maxOrOptions: number | SelectPushBatchOptions = 500,
): Promise<SyncOperationRecord[]> {
  const options: SelectPushBatchOptions =
    typeof maxOrOptions === 'number'
      ? { max: maxOrOptions, ownerUserId: getActiveOwnerUserId() ?? '' }
      : maxOrOptions

  const ownerUserId = options.ownerUserId
  if (!ownerUserId) {
    return []
  }

  await refreshBlockedOperations(store, ownerUserId)
  const all = await store.listOperations({ ownerUserId })
  const byId = new Map(all.map((op) => [op.clientOperationId, op]))
  const ready = all.filter(
    (op) =>
      op.status === 'pending' &&
      op.ownerUserId === ownerUserId &&
      isOperationReady(op, byId),
  )
  return ready.slice(0, options.max ?? 500)
}

export async function countByStatuses(
  store: LocalStore,
  statuses: OutboxStatus[],
  ownerUserId?: string,
): Promise<number> {
  return store.countOperations(statuses, ownerUserId ? { ownerUserId } : undefined)
}
