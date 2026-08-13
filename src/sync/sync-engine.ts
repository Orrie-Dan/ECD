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
import { queryClient } from '@/api/query-client'
import { children } from '@/api/query-keys'
import { getActiveOwnerUserId } from '@/storage/ownership'
import {
  clearBrowserDeviceIdentity,
  ensureDeviceRegistered,
} from '@/features/device'
import {
  isDeviceOwnershipError,
  isServerUnavailableError,
} from '@/sync/failure-class'

type Listener = (snapshot: SyncStatusSnapshot) => void

export class SyncEngine {
  private status: SyncEngineStatus = 'IDLE'
  private lastError: string | null = null
  private lastSyncedAt: string | null = null
  private listeners = new Set<Listener>()
  private running: Promise<void> | null = null
  private authRequired = false
  private deviceBlocked = false
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
    if (!required) this.deviceBlocked = false
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

    if (this.deviceBlocked) {
      const blockedOwner = getActiveOwnerUserId()
      if (blockedOwner) {
        try {
          const repaired = await ensureDeviceRegistered({
            userId: blockedOwner,
            store: this.store,
          })
          if (repaired.ok) {
            this.deviceBlocked = false
            this.lastError = null
          }
        } catch {
          /* keep blocked; the automatic loop retries */
        }
      }
      if (this.deviceBlocked) {
        this.status = 'DEVICE_BLOCKED'
        await this.emitAsync()
        return
      }
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
      this.status = 'DEVICE_PENDING'
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
      let deviceId =
        tokenStorage.getDeviceId() ?? (await cycleStore.getMeta(META_KEYS.deviceId))
      if (!deviceId) {
        const row = await cycleStore.getDevice()
        deviceId = row?.id ?? null
      }
      if (deviceId && !tokenStorage.getDeviceId()) {
        tokenStorage.setDeviceId(deviceId)
      }
      if (!deviceId) {
        try {
          const registered = await ensureDeviceRegistered({
            userId: ownerUserId,
            store: cycleStore,
          })
          if (registered.ok) {
            deviceId = registered.deviceId
          }
        } catch {
          /* fall through to DEVICE_PENDING */
        }
      }
      if (!deviceId) {
        this.lastError = 'Device not registered'
        this.status = 'DEVICE_PENDING'
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
      // Pull writes LocalStore without going through React Query — refresh
      // caregiver list so UI cannot stay at 0 while IDB/API already have rows.
      void queryClient.invalidateQueries({ queryKey: children.keys.all })
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

      const [pendingCount, syncingCount, blockedCount, failedCount, conflictCountAfter] =
        await Promise.all([
          cycleStore.countOperations(['pending'], { ownerUserId }),
          cycleStore.countOperations(['syncing'], { ownerUserId }),
          cycleStore.countOperations(['blocked'], { ownerUserId }),
          cycleStore.countOperations(['failed'], { ownerUserId }),
          cycleStore.countOperations(['conflict'], { ownerUserId }),
        ])
      const unresolved = pendingCount + syncingCount + blockedCount

      if (unresolved > 0) {
        this.authRequired = false
        this.status = 'PENDING'
        if (!this.lastError) {
          this.lastError =
            syncingCount > 0 ? 'Session still processing' : 'Waiting to sync'
        }
        await this.emitAsync()
        return
      }

      if (failedCount > 0) {
        this.status = 'SYNC_ERROR'
        await this.emitAsync()
        return
      }

      if (conflictCountAfter > 0) {
        this.status = 'CONFLICT_PRESENT'
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
        await this.emitAsync()
        return
      }
      if (isDeviceOwnershipError(error)) {
        this.deviceBlocked = true
        this.status = 'DEVICE_BLOCKED'
        this.lastError = 'Sync paused — device identity must be re-registered'
        try {
          clearBrowserDeviceIdentity()
          const repaired = await ensureDeviceRegistered({
            userId: ownerUserId,
            store: cycleStore,
          })
          if (repaired.ok) {
            this.deviceBlocked = false
            this.lastError = 'Device identity repaired — waiting to sync'
            this.status = 'PENDING'
          }
        } catch {
          /* keep blocked; heartbeat will retry repair */
        }
        await this.emitAsync()
        return
      }
      if (isServerUnavailableError(error)) {
        this.lastError = apiError.message || 'Server unavailable'
        this.status = 'SERVER_UNAVAILABLE'
        networkState.markUnreachable()
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
    if (this.deviceBlocked) return 'DEVICE_BLOCKED'
    if (networkState.getSnapshot().status === 'OFFLINE') return 'OFFLINE'
    if (this.status === 'SYNCING') return 'SYNCING'
    if (this.status === 'DEVICE_PENDING') return 'DEVICE_PENDING'
    if (this.status === 'SERVER_UNAVAILABLE') return 'SERVER_UNAVAILABLE'
    if (conflictCount > 0) return 'CONFLICT_PRESENT'
    if (this.status === 'SYNC_ERROR' || failedCount > 0) return 'SYNC_ERROR'
    if (pendingLike > 0) {
      return networkState.getSnapshot().status === 'ONLINE' ? 'PENDING' : 'OFFLINE'
    }
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
