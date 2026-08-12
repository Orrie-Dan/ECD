import type { LocalStore } from '@/storage/local-store'
import type { OutboxStatus, SyncOperationRecord } from '@/storage/types'
import { getActiveOwnerUserId } from '@/storage/ownership'
import { isRetryableOutboxError, isVillageReferenceBlocked } from '@/sync/failure-class'

/**
 * Outbox readiness: an op is ready when every dependency is applied.
 */
export function isOperationReady(
  op: SyncOperationRecord,
  byId: Map<string, SyncOperationRecord>,
): boolean {
  if (op.status === 'applied' || op.status === 'syncing') return false
  if (op.status === 'conflict') return false
  if (op.status === 'failed' && !isRetryableOutboxError(op.lastError)) return false
  if (isVillageReferenceBlocked(op.lastError)) return false
  return (op.dependsOn ?? []).every((depId) => byId.get(depId)?.status === 'applied')
}

export async function recoverRetryableFailedOperations(
  store: LocalStore,
  ownerUserId?: string,
): Promise<void> {
  const owner = ownerUserId ?? getActiveOwnerUserId() ?? undefined
  const failedCount = await store.countOperations(
    ['failed'],
    owner ? { ownerUserId: owner } : undefined,
  )
  if (failedCount === 0) return
  const failed = await store.listOperations({
    ownerUserId: owner,
    status: 'failed',
  })
  for (const op of failed) {
    if (!isRetryableOutboxError(op.lastError)) continue
    await store.updateOperation(op.clientOperationId, {
      status: 'pending',
      lastError: op.lastError,
    })
  }
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
      if (isVillageReferenceBlocked(op.lastError)) continue
      await store.updateOperation(op.clientOperationId, {
        status: 'pending',
        lastError: undefined,
      })
    } else if (!ready && op.status === 'pending') {
      await store.updateOperation(op.clientOperationId, {
        status: 'blocked',
        lastError: isVillageReferenceBlocked(op.lastError)
          ? op.lastError
          : 'Waiting for dependency operations',
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

  await recoverRetryableFailedOperations(store, ownerUserId)
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
