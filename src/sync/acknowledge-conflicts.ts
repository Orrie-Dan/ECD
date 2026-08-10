import type { LocalStore } from '@/storage/local-store'
import { getActiveOwnerUserId } from '@/storage/ownership'

/**
 * After CAS server-wins pull, conflict rows remain visible for caretaker attention.
 * Explicit acknowledge marks them applied so logout/pending counts clear without
 * discarding the whole workspace.
 */
export async function acknowledgeConflictOperations(
  store: LocalStore,
  options?: {
    ownerUserId?: string | null
    clientOperationIds?: string[]
  },
): Promise<number> {
  const ownerUserId = options?.ownerUserId ?? getActiveOwnerUserId() ?? undefined
  const conflicts = await store.listOperations({
    status: 'conflict',
    ownerUserId,
  })
  const targets = options?.clientOperationIds?.length
    ? conflicts.filter((op) => options.clientOperationIds!.includes(op.clientOperationId))
    : conflicts

  for (const op of targets) {
    await store.updateOperation(op.clientOperationId, {
      status: 'applied',
      lastError: 'Acknowledged: server version kept',
    })
  }
  return targets.length
}
