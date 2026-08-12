import {
  syncControllerSessionStatus,
} from '@/api/generated/endpoints/sync/sync'
import type { LocalStore } from '@/storage/local-store'
import {
  ORPHAN_SYNCING_RECOVERY_MS,
  SESSION_POLL_INTERVAL_MS,
  SESSION_POLL_MAX_WALL_MS,
  SESSION_POLL_STALL_ATTEMPTS,
} from '@/sync/sync-types'
import { markEntityApplied } from '@/sync/apply-local'
import { isPermanentOutboxError, isRetryableOutboxError } from '@/sync/failure-class'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function progressKey(dto: {
  status: string
  successfulOperations: number
  failedOperations: number
  retryCount: number
  operations: Array<{ status: string; processedAt?: string | Date | null }>
}): string {
  const processed = dto.operations.filter((op) => op.status !== 'pending').length
  return `${dto.status}:${dto.successfulOperations}:${dto.failedOperations}:${dto.retryCount}:${processed}`
}

export type SessionPollOutcome = 'completed' | 'failed' | 'timeout' | 'progressing'

export interface PollSessionOptions {
  maxStallAttempts?: number
  intervalMs?: number
  maxWallMs?: number
}

let pollOptionsForTests: PollSessionOptions | undefined

export function setPollSessionOptionsForTests(options?: PollSessionOptions): void {
  pollOptionsForTests = options
}

/**
 * Poll sync session until completed/failed, stalled (no progress), or wall clock exhausted.
 * Timeout does NOT mark operations applied and does NOT imply sync success.
 */
export async function pollSessionUntilSettled(
  store: LocalStore,
  sessionId: string,
  options?: PollSessionOptions,
): Promise<SessionPollOutcome> {
  const maxStall =
    options?.maxStallAttempts ??
    pollOptionsForTests?.maxStallAttempts ??
    SESSION_POLL_STALL_ATTEMPTS
  const intervalMs =
    options?.intervalMs ?? pollOptionsForTests?.intervalMs ?? SESSION_POLL_INTERVAL_MS
  const maxWallMs =
    options?.maxWallMs ?? pollOptionsForTests?.maxWallMs ?? SESSION_POLL_MAX_WALL_MS
  const startedAt = Date.now()

  let lastKey = ''
  let idleAttempts = 0

  while (Date.now() - startedAt < maxWallMs) {
    const dto = await syncControllerSessionStatus(sessionId)

    await store.upsertSession({
      sessionId: dto.id,
      status: dto.status,
      createdAt: dto.startedAt,
      updatedAt: new Date().toISOString(),
      error: dto.status === 'failed' ? 'Session failed' : undefined,
    })

    const seen = new Set<string>()
    for (const op of dto.operations) {
      seen.add(op.clientOperationId)
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
        const reason = op.conflictReason ?? 'failed'
        if (isPermanentOutboxError(reason)) {
          await store.updateOperation(op.clientOperationId, {
            status: 'failed',
            lastError: reason,
            sessionId,
          })
        } else if (isRetryableOutboxError(reason)) {
          await store.updateOperation(op.clientOperationId, {
            status: 'pending',
            lastError: reason,
            sessionId,
          })
        } else {
          await store.updateOperation(op.clientOperationId, {
            status: 'failed',
            lastError: reason,
            sessionId,
          })
        }
      }
    }

    if (dto.status === 'completed' || dto.status === 'failed') {
      const lingering = await store.listOperations({ status: 'syncing' })
      for (const op of lingering) {
        if (op.sessionId !== sessionId) continue
        if (seen.has(op.clientOperationId)) continue
        // Session ended without a terminal DTO for this op — keep it replayable.
        await store.updateOperation(op.clientOperationId, {
          status: 'pending',
          lastError:
            dto.status === 'failed'
              ? 'Session ended before operation applied'
              : undefined,
        })
      }
      return dto.status
    }

    const key = progressKey(dto)
    if (key !== lastKey) {
      lastKey = key
      idleAttempts = 0
    } else {
      idleAttempts += 1
    }

    if (idleAttempts >= maxStall) {
      break
    }

    await sleep(intervalMs)
  }

  // Stalled / timed out — keep sessionId and leave ops syncing so a later
  // cycle polls this session. Never treat timeout as applied/synced.
  const stuck = await store.listOperations({ status: 'syncing' })
  for (const op of stuck) {
    if (op.sessionId !== sessionId) continue
    await store.updateOperation(op.clientOperationId, {
      lastError: 'Session still processing',
    })
  }
  return 'timeout'
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

    console.info(
      JSON.stringify({
        event: 'sync.orphan.reset',
        clientOperationId: op.clientOperationId,
        entityType: op.entityType,
        entityId: op.entityId,
      }),
    )
    await store.updateOperation(op.clientOperationId, {
      status: 'pending',
      lastError: undefined,
    })
  }

  for (const sessionId of sessionIdsToPoll) {
    console.info(
      JSON.stringify({
        event: 'sync.orphan.poll',
        sessionId,
      }),
    )
    await pollSessionUntilSettled(store, sessionId)
  }
}
