import type { OutboxStatus } from '@/storage/types'

export type SyncEngineStatus =
  | 'IDLE'
  | 'SYNCING'
  | 'SYNC_ERROR'
  | 'CONFLICT_PRESENT'
  | 'AUTH_REQUIRED'
  | 'OFFLINE'

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
export const SESSION_POLL_MAX_ATTEMPTS = 40
