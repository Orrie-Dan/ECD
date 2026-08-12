import type { LocalStore } from '@/storage/local-store'

const ACTIVE = ['pending', 'blocked', 'syncing'] as const

/**
 * Find an unsynced child CREATE so child-scoped ops can set dependsOn.
 */
export async function findUnsyncedChildCreateOp(
  store: LocalStore,
  childId: string,
): Promise<string | null> {
  const ops = await store.listOperations({ status: [...ACTIVE] })
  const match = ops.find(
    (op) =>
      op.entityType === 'child' &&
      op.operation === 'create' &&
      op.entityId === childId,
  )
  return match?.clientOperationId ?? null
}
