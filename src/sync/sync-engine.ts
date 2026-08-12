import type { LocalStore } from '@/storage/local-store'
import { getLocalStore, getDexieLocalStore } from '@/storage'
import { DexieLocalStore } from '@/storage/dexie-local-store'
import {
  acquireSyncDbLease,
  getOfflineDbName,
  releaseSyncDbLease,
} from '@/storage/db'
import { META_KEYS } from '@/storage/types'
import { networkState } from '@/network/network-state'
import { pushOutbox, resolveSessionIdsToPoll } from '@/sync/push'
import { pollSessionUntilSettled, recoverOrphanedSyncOperations } from '@/sync/session'
import { pullAll, pullOnce } from '@/sync/pull'
import {
  ACTIVE_OUTBOX_STATUSES,
  type SyncEngineStatus,
  type SyncStatusSnapshot,
} from '@/sync/sync-types'
import { tokenStorage } from '@/api/token-storage'
import { normalizeApiError } from '@/api/errors'
import { getActiveOwnerUserId } from '@/storage/ownership'

type Listener = (snapshot: SyncStatusSnapshot) => void

export class SyncEngine {
  private status: SyncEngineStatus = 'IDLE'
  private lastError: string | null = null
  private lastSyncedAt: string | null = null
  private listeners = new Set<Listener>()
  private running: Promise<void> | null = null
  private authRequired = false
  private abortRequested = false
  /** Fallback store when constructed for tests; cycles pin their own DB-bound store. */
  private readonly store: LocalStore

  constructor(store: LocalStore = getLocalStore()) {
    this.store = store
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    void this.emitAsync()
    return () => this.listeners.delete(listener)
  }

  getSnapshotSync(): SyncStatusSnapshot {
    return {
      status: this.deriveStatus(0, 0, 0),
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      blockedCount: 0,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    }
  }

  async getSnapshot(): Promise<SyncStatusSnapshot> {
    const ownerUserId = getActiveOwnerUserId() ?? undefined
    const store = this.store
    const [pendingCount, failedCount, conflictCount, blockedCount, lastSyncedAt] =
      await Promise.all([
        store.countOperations(['pending', 'syncing'], ownerUserId ? { ownerUserId } : undefined),
        store.countOperations(['failed'], ownerUserId ? { ownerUserId } : undefined),
        store.countOperations(['conflict'], ownerUserId ? { ownerUserId } : undefined),
        store.countOperations(['blocked'], ownerUserId ? { ownerUserId } : undefined),
        store.getMeta(META_KEYS.lastSyncedAt),
      ])
    this.lastSyncedAt = ownerUserId ? lastSyncedAt : null
    return {
      status: this.deriveStatus(conflictCount, failedCount, pendingCount + blockedCount),
      pendingCount: pendingCount + blockedCount,
      failedCount,
      conflictCount,
      blockedCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    }
  }

  setAuthRequired(required: boolean): void {
    this.authRequired = required
    void this.emitAsync()
  }

  isSyncing(): boolean {
    return this.running !== null
  }

  /** Ask the in-flight cycle to stop at the next safe checkpoint. */
  requestAbort(): void {
    this.abortRequested = true
  }

  async waitUntilIdle(): Promise<void> {
    if (this.running) await this.running
  }

  /** Explicit sync cycle: pull then push. No-op when offline (except status). */
  async syncNow(): Promise<void> {
    if (this.running) return this.running
    this.abortRequested = false
    this.running = this.runCycle().finally(() => {
      this.running = null
      this.abortRequested = false
    })
    return this.running
  }

  private identityStillValid(userId: string, dbName: string): boolean {
    if (this.abortRequested) return false
    return getActiveOwnerUserId() === userId && getOfflineDbName() === dbName
  }

  private async runCycle(): Promise<void> {
    const net = networkState.getSnapshot()
    if (net.status === 'OFFLINE') {
      this.status = 'OFFLINE'
      this.lastError = null
      await this.emitAsync()
      return
    }

    if (this.authRequired) {
      this.status = 'AUTH_REQUIRED'
      await this.emitAsync()
      return
    }

    if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
      this.authRequired = true
      this.status = 'AUTH_REQUIRED'
      await this.emitAsync()
      return
    }

    const ownerUserId = getActiveOwnerUserId()
    const cycleDbName = getOfflineDbName()
    if (!ownerUserId || !cycleDbName) {
      this.lastError = 'No active local owner'
      this.status = 'SYNC_ERROR'
      await this.emitAsync()
      return
    }

    // Pin a store to the leased DB so singleton rebind cannot redirect pull/push writes.
    const cycleDb = getDexieLocalStore().getDatabase()
    const cycleStore = new DexieLocalStore(cycleDb)
    acquireSyncDbLease(cycleDbName)

    this.status = 'SYNCING'
    this.lastError = null
    await this.emitAsync()

    try {
      const deviceId =
        tokenStorage.getDeviceId() ?? (await cycleStore.getMeta(META_KEYS.deviceId))
      if (!deviceId) {
        this.lastError = 'Device not registered'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }

      if (!this.identityStillValid(ownerUserId, cycleDbName)) {
        this.lastError = 'Local owner changed during sync'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }

      if (net.status === 'RECONNECTING') {
        networkState.beginReconnect()
      }

      // Recover ops stuck in syncing (or pending+sessionId) from a prior cycle
      // that never started/finished session polling — before pull/push.
      await recoverOrphanedSyncOperations(cycleStore, { ownerUserId })
      if (!this.identityStillValid(ownerUserId, cycleDbName)) {
        this.lastError = 'Local owner changed during sync'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }

      await pullAll(cycleStore, {
        deviceId,
        shouldContinue: () => this.identityStillValid(ownerUserId, cycleDbName),
      })
      if (!this.identityStillValid(ownerUserId, cycleDbName)) {
        this.lastError = 'Local owner changed during sync'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }
      networkState.markReachable()

      const pushResult = await pushOutbox(cycleStore, deviceId, { ownerUserId })
      if (!this.identityStillValid(ownerUserId, cycleDbName)) {
        this.lastError = 'Local owner changed during sync'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }
      if (pushResult) {
        const { sessionIds, usedPerOpFallback } = resolveSessionIdsToPoll(pushResult)
        if (usedPerOpFallback) {
          console.info(
            '[sync] push poll fallback: using per-op sessionId(s)',
            sessionIds,
          )
        }
        for (const id of sessionIds) {
          await pollSessionUntilSettled(cycleStore, id)
        }
      }

      // Conflicts: pull again so server CAS state lands locally while conflict ops stay visible.
      const conflictCount = await cycleStore.countOperations(['conflict'], { ownerUserId })
      if (conflictCount > 0) {
        if (!this.identityStillValid(ownerUserId, cycleDbName)) {
          this.lastError = 'Local owner changed during sync'
          this.status = 'SYNC_ERROR'
          await this.emitAsync()
          return
        }
        await pullOnce(cycleStore, { deviceId })
      }

      if (!this.identityStillValid(ownerUserId, cycleDbName)) {
        this.lastError = 'Local owner changed during sync'
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }

      const now = new Date().toISOString()
      await cycleStore.setMeta(META_KEYS.lastSyncedAt, now)
      this.lastSyncedAt = now
      this.authRequired = false
      this.lastError = null
      this.status = 'IDLE'
      networkState.markReachable()
      await this.emitAsync()
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.isUnauthorized) {
        this.authRequired = true
        this.status = 'AUTH_REQUIRED'
        this.lastError = 'Sign in required to synchronize'
        // Do NOT clear IndexedDB / outbox.
        await this.emitAsync()
        return
      }
      this.lastError = apiError.message || 'Sync failed'
      this.status = 'SYNC_ERROR'
      networkState.markUnreachable()
      await this.emitAsync()
    } finally {
      releaseSyncDbLease(cycleDbName)
    }
  }

  private deriveStatus(
    conflictCount: number,
    failedCount: number,
    pendingLike: number,
  ): SyncEngineStatus {
    if (this.authRequired) return 'AUTH_REQUIRED'
    if (networkState.getSnapshot().status === 'OFFLINE') return 'OFFLINE'
    if (this.status === 'SYNCING') return 'SYNCING'
    if (conflictCount > 0) return 'CONFLICT_PRESENT'
    if (this.status === 'SYNC_ERROR' || failedCount > 0) return 'SYNC_ERROR'
    if (pendingLike > 0 && networkState.getSnapshot().status !== 'ONLINE') return 'OFFLINE'
    return 'IDLE'
  }

  private async emitAsync(): Promise<void> {
    const snap = await this.getSnapshot()
    // Preserve SYNCING while cycle runs.
    if (this.running && this.status === 'SYNCING') {
      snap.status = 'SYNCING'
    }
    for (const listener of this.listeners) listener(snap)
  }
}

let engineSingleton: SyncEngine | null = null

export function getSyncEngine(): SyncEngine {
  if (!engineSingleton) {
    engineSingleton = new SyncEngine()
  }
  return engineSingleton
}

export function resetSyncEngineForTests(store?: LocalStore): SyncEngine {
  engineSingleton = new SyncEngine(store ?? getLocalStore())
  return engineSingleton
}

// silence unused in case tree-shaking — ACTIVE used by status UI
void ACTIVE_OUTBOX_STATUSES
