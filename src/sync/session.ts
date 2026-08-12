import {
  syncControllerSessionStatus,
} from '@/api/generated/endpoints/sync/sync'
import type { LocalStore } from '@/storage/local-store'
import {
  ORPHAN_SYNCING_RECOVERY_MS,
  SESSION_POLL_INTERVAL_MS,
  SESSION_POLL_MAX_ATTEMPTS,
} from '@/sync/sync-types'
import { markEntityApplied } from '@/sync/apply-local'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll sync session until completed/failed or attempts exhausted.
 */
export async function pollSessionUntilSettled(
  store: LocalStore,
  sessionId: string,
): Promise<void> {
  for (let attempt = 0; attempt < SESSION_POLL_MAX_ATTEMPTS; attempt += 1) {
    const dto = await syncControllerSessionStatus(sessionId)

    await store.upsertSession({
      sessionId: dto.id,
      status: dto.status,
      createdAt: dto.startedAt,
      updatedAt: new Date().toISOString(),
      error: dto.status === 'failed' ? 'Session failed' : undefined,
    })

    for (const op of dto.operations) {
      if (op.status === 'applied') {
        await store.updateOperation(op.clientOperationId, {
          status: 'applied',
          lastError: undefined,
          sessionId,
        })
        const localOp = await store.getOperation(op.clientOperationId)
        if (localOp) {
          await markEntityApplied(store, localOp)
        }
      } else if (op.status === 'conflict') {
        await store.updateOperation(op.clientOperationId, {
          status: 'conflict',
          lastError: op.conflictReason ?? 'conflict',
          sessionId,
        })
      } else if (op.status === 'failed') {
        await store.updateOperation(op.clientOperationId, {
          status: 'failed',
          lastError: op.conflictReason ?? 'failed',
          sessionId,
        })
      }
    }

    if (dto.status === 'completed' || dto.status === 'failed') {
      // Any still-pending ops in this session → pending for retry or failed with session.
      const lingering = await store.listOperations({ status: 'syncing' })
      for (const op of lingering) {
        if (op.sessionId !== sessionId) continue
        await store.updateOperation(op.clientOperationId, {
          status: dto.status === 'failed' ? 'failed' : 'pending',
          lastError:
            dto.status === 'failed'
              ? 'Session failed before operation applied'
              : undefined,
        })
      }
      return
    }

    await sleep(SESSION_POLL_INTERVAL_MS)
  }

  // Timed out — return syncing ops to pending for a later cycle (same IDs).
  const stuck = await store.listOperations({ status: 'syncing' })
  for (const op of stuck) {
    if (op.sessionId !== sessionId) continue
    await store.updateOperation(op.clientOperationId, {
      status: 'pending',
      lastError: 'Session poll timed out',
    })
  }
}

/**
 * Recover outbox rows stuck after a push that never started (or finished) polling.
 * - `syncing` without sessionId → reset to `pending` for a normal re-push.
 * - `syncing` / `pending` with a stamped sessionId → poll that session via the
 *   existing poller (applied / conflict / failed / pending-on-timeout).
 */
export async function recoverOrphanedSyncOperations(
  store: LocalStore,
  options: { ownerUserId: string; olderThanMs?: number },
): Promise<void> {
  const { ownerUserId } = options
  if (!ownerUserId) return

  const olderThanMs = options.olderThanMs ?? ORPHAN_SYNCING_RECOVERY_MS
  const cutoff = Date.now() - olderThanMs
  const candidates = await store.listOperations({
    ownerUserId,
    status: ['syncing', 'pending'],
  })

  const sessionIdsToPoll = new Set<string>()

  for (const op of candidates) {
    const updatedAtMs = Date.parse(op.updatedAt)
    if (!Number.isFinite(updatedAtMs) || updatedAtMs > cutoff) continue

    if (op.status === 'pending' && !op.sessionId) continue

    if (op.sessionId) {
      sessionIdsToPoll.add(op.sessionId)
      continue
    }

    // syncing with no sessionId — re-enter the push batch.
    console.info(
      '[sync] orphan sweep: reset syncing op without sessionId to pending',
      op.clientOperationId,
    )
    await store.updateOperation(op.clientOperationId, {
      status: 'pending',
      lastError: undefined,
    })
  }

  for (const sessionId of sessionIdsToPoll) {
    console.info('[sync] orphan sweep: polling stamped session', sessionId)
    await pollSessionUntilSettled(store, sessionId)
  }
}
