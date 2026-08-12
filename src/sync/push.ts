import {
  syncControllerPush,
} from '@/api/generated/endpoints/sync/sync'
import type { SyncPushOperationDto } from '@/api/generated/models'
import type { LocalStore } from '@/storage/local-store'
import type { SyncOperationRecord } from '@/storage/types'
import { selectPushBatch } from '@/sync/outbox'
import { MAX_PUSH_BATCH } from '@/sync/sync-types'
import { markEntityApplied } from '@/sync/apply-local'

function toPushDto(op: SyncOperationRecord): SyncPushOperationDto {
  return {
    clientOperationId: op.clientOperationId,
    entityType: op.entityType,
    operation: op.operation,
    entityId: op.entityId,
    localId: op.localId,
    payload: op.payload,
    version: op.version,
    clientTimestamp: op.clientTimestamp,
  }
}

export interface PushOperationResult {
  clientOperationId: string
  status: string
  conflictReason: string | null
  entityId: string | null
  replayed: boolean
  sessionId: string | null
}

export interface PushResult {
  sessionId: string | null
  operationResults: PushOperationResult[]
}

/**
 * Sessions the engine should poll after push.
 * Prefers top-level sessionId; on all-replay batches (top-level null) falls
 * back to unique non-null per-op sessionIds.
 */
export function resolveSessionIdsToPoll(result: PushResult): {
  sessionIds: string[]
  usedPerOpFallback: boolean
} {
  if (result.sessionId) {
    return { sessionIds: [result.sessionId], usedPerOpFallback: false }
  }
  const ids = new Set<string>()
  for (const op of result.operationResults) {
    if (op.sessionId) ids.add(op.sessionId)
  }
  return { sessionIds: [...ids], usedPerOpFallback: ids.size > 0 }
}

/**
 * Push ready outbox ops via existing Orval sync client.
 * Reuses clientOperationId; never regenerates IDs on retry.
 * Hard ownership guard: only `ownerUserId` operations are pushed.
 */
export async function pushOutbox(
  store: LocalStore,
  deviceId: string,
  options: { ownerUserId: string },
): Promise<PushResult | null> {
  const { ownerUserId } = options
  if (!ownerUserId) {
    return null
  }

  const batch = await selectPushBatch(store, { ownerUserId, max: MAX_PUSH_BATCH })
  // Defense in depth — never push another user's ops even if selection regresses.
  const ownedBatch = batch.filter((op) => op.ownerUserId === ownerUserId)
  if (ownedBatch.length === 0) {
    return null
  }

  for (const op of ownedBatch) {
    await store.updateOperation(op.clientOperationId, {
      status: 'syncing',
      attempts: op.attempts + 1,
    })
  }

  try {
    const response = await syncControllerPush({
      deviceId,
      operations: ownedBatch.map(toPushDto),
    })

    const sessionId = response.sessionId
    if (sessionId) {
      await store.upsertSession({
        sessionId,
        status: response.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerUserId,
      })
      for (const op of ownedBatch) {
        await store.updateOperation(op.clientOperationId, { sessionId })
      }
    } else {
      // All-replay / dedup path: top-level sessionId is null but per-op may carry
      // the original session. Stamp those so poll timeout matching works.
      const stampedSessions = new Set<string>()
      for (const result of response.operations) {
        if (!result.sessionId || result.status !== 'pending') continue
        await store.updateOperation(result.clientOperationId, {
          sessionId: result.sessionId,
        })
        if (!stampedSessions.has(result.sessionId)) {
          stampedSessions.add(result.sessionId)
          await store.upsertSession({
            sessionId: result.sessionId,
            status: response.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerUserId,
          })
        }
      }
    }

    // Immediate terminal statuses from push response (dedupe / already applied).
    for (const result of response.operations) {
      if (result.status === 'applied') {
        await store.updateOperation(result.clientOperationId, {
          status: 'applied',
          lastError: undefined,
          sessionId: result.sessionId ?? sessionId ?? undefined,
        })
        const localOp = await store.getOperation(result.clientOperationId)
        if (localOp) {
          await markEntityApplied(store, localOp)
        }
      } else if (result.status === 'conflict') {
        await store.updateOperation(result.clientOperationId, {
          status: 'conflict',
          lastError: result.conflictReason ?? 'conflict',
          sessionId: result.sessionId ?? sessionId ?? undefined,
        })
      } else if (result.status === 'failed') {
        await store.updateOperation(result.clientOperationId, {
          status: 'failed',
          lastError: result.conflictReason ?? 'failed',
          sessionId: result.sessionId ?? sessionId ?? undefined,
        })
      }
      // pending → wait for session poll (top-level or per-op fallback)
    }

    return {
      sessionId,
      operationResults: response.operations.map((r) => ({
        clientOperationId: r.clientOperationId,
        status: r.status,
        conflictReason: r.conflictReason,
        entityId: r.entityId,
        replayed: r.replayed,
        sessionId: r.sessionId,
      })),
    }
  } catch (error) {
    // Restore to pending for retry — keep same clientOperationId.
    for (const op of ownedBatch) {
      await store.updateOperation(op.clientOperationId, {
        status: 'pending',
        lastError: error instanceof Error ? error.message : 'Push failed',
      })
    }
    throw error
  }
}
