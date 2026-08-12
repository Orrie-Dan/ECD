import type { OutboxStatus } from '@/storage/types'

export type SyncEngineStatus =
  | 'IDLE'
  | 'SYNCING'
  | 'PENDING'
  | 'SYNC_ERROR'
  | 'CONFLICT_PRESENT'
  | 'AUTH_REQUIRED'
  | 'OFFLINE'
  | 'SERVER_UNAVAILABLE'
  | 'DEVICE_BLOCKED'
  | 'DEVICE_PENDING'

export interface SyncStatusSnapshot {
  status: SyncEngineStatus
  pendingCount: number
  failedCount: number
  conflictCount: number
  blockedCount: number
  lastSyncedAt: string | null
  lastError: string | null
}

export const ACTIVE_OUTBOX_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']
export const UNSYNCED_OUTBOX_STATUSES: OutboxStatus[] = [
  'pending',
  'blocked',
  'syncing',
  'conflict',
  'failed',
]

export const MAX_PUSH_BATCH = 500
export const SESSION_POLL_INTERVAL_MS = 750
/** Consecutive polls with no progress before treating the session as stalled. */
export const SESSION_POLL_STALL_ATTEMPTS = 40
/** @deprecated Use SESSION_POLL_STALL_ATTEMPTS — kept for existing imports. */
export const SESSION_POLL_MAX_ATTEMPTS = SESSION_POLL_STALL_ATTEMPTS
/** Wall-clock cap while the session is still making progress. */
export const SESSION_POLL_MAX_WALL_MS = 120_000
/** Periodic sync while unsynced work remains and the app is online. */
export const SYNC_HEARTBEAT_MS = 60_000

/**
 * Client-side recovery window for ops stuck in `syncing` (or pending with a
 * stamped sessionId) when the initial post-push poll never started.
 * Shorter than the server's 5-minute stale-session recovery.
 */
export const ORPHAN_SYNCING_RECOVERY_MS = 30_000
