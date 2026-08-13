/**
 * Sprint 4.8.7 — Offline UX, reconnect, large-queue, and operational hardening tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  activateLocalWorkspace,
  deactivateLocalWorkspace,
  deleteUserLocalDatabase,
  getLocalStore,
  META_KEYS,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { selectPushBatch } from '@/sync/outbox'
import { resetSyncEngineForTests } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import { MAX_PUSH_BATCH, UNSYNCED_OUTBOX_STATUSES } from '@/sync/sync-types'
import {
  evaluateLogoutPolicy,
  applyLogoutDataPolicy,
} from '@/offline/logout-policy'
import { clearTestOwner } from '@/storage/test-owner'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/devices/devices', () => ({
  devicesControllerRegister: vi.fn().mockRejectedValue({
    statusCode: 0,
    message: 'Network error',
    messages: ['Network error'],
    isUnauthorized: false,
    isForbidden: false,
    isConflict: false,
    isNetworkError: true,
    isValidationError: false,
    isNotFound: false,
  }),
}))

import { syncControllerPull, syncControllerPush } from '@/api/generated/endpoints/sync/sync'

const USER = 'ux-hardening-user'

function emptyBuckets() {
  return {
    child: [],
    attendance_record: [],
    child_nutrition_screening: [],
    child_transfer: [],
    ecd_center: [],
    compliance_assessment: [],
    compliance_assessment_item: [],
    wash_indicator: [],
    center_feeding_day: [],
    center_feeding_month_summary: [],
    sted_assessment: [],
    referral: [],
  }
}

describe('Sprint 4.8.7 offline UX & operational hardening', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' })
    tokenStorage.setDeviceId('device-ux')
    clearTestOwner()
    localStorage.removeItem('ecd_legacy_db_migrated_to')
    await deleteUserLocalDatabase(USER).catch(() => undefined)
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
  })

  afterEach(async () => {
    clearTestOwner()
    await deactivateLocalWorkspace().catch(() => undefined)
    await deleteUserLocalDatabase(USER).catch(() => undefined)
  })

  it('logout policy exposes sync / keep / discard when pending', async () => {
    await activateLocalWorkspace(USER, 'c1')
    await getLocalStore().enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    expect((await evaluateLogoutPolicy('cancel')).allowed).toBe(false)
    expect((await evaluateLogoutPolicy('keep_on_device')).allowed).toBe(true)
    expect((await evaluateLogoutPolicy('discard_local')).allowed).toBe(true)
    expect((await evaluateLogoutPolicy('sync_then_logout')).allowed).toBe(true)
  })

  it('sync_then_logout keeps data when sync cannot clear pending', async () => {
    await activateLocalWorkspace(USER, 'c1')
    const opId = createUuid()
    await getLocalStore().enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    tokenStorage.setDeviceId('device-ux')
    vi.mocked(syncControllerPull).mockRejectedValue(new Error('network'))
    await applyLogoutDataPolicy('sync_then_logout')
    const still = await evaluateLogoutPolicy('cancel')
    expect(still.allowed).toBe(false)
    expect(await getLocalStore().getOperation(opId)).toBeTruthy()
  })

  it('discard_local clears only pending workspace data', async () => {
    await activateLocalWorkspace(USER, 'c1')
    await getLocalStore().enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    await applyLogoutDataPolicy('discard_local', { userId: USER })
    await activateLocalWorkspace(USER, 'c1')
    expect(await getLocalStore().listOperations()).toHaveLength(0)
  })

  it('AUTH_REQUIRED preserves outbox and domain rows', async () => {
    await activateLocalWorkspace(USER, 'c1')
    await getLocalStore().putChild({
      id: 'child-1',
      version: 1,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'clean',
      registrationNumber: 'R1',
      firstName: 'A',
      fullName: 'A',
      centerId: 'c1',
      centerName: 'C',
      dateOfBirth: '2020-01-01',
      gender: 'Umukobwa',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '078',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'v',
      registeredAt: '2024-01-01',
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
    })
    await getLocalStore().enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    const engine = resetSyncEngineForTests(getLocalStore())
    engine.setAuthRequired(true)
    await engine.syncNow()
    expect((await engine.getSnapshot()).status).toBe('AUTH_REQUIRED')
    expect(await getLocalStore().getChild('child-1')).toBeTruthy()
    expect(
      await getLocalStore().countOperations(UNSYNCED_OUTBOX_STATUSES, { ownerUserId: USER }),
    ).toBeGreaterThan(0)
  })

  it('Sprint 5.9: missing device is DEVICE_PENDING not AUTH_REQUIRED', async () => {
    await activateLocalWorkspace(USER, 'c1')
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' })
    tokenStorage.clearDeviceId()
    await getLocalStore().setMeta(META_KEYS.deviceId, '')

    const engine = resetSyncEngineForTests(getLocalStore())
    engine.setAuthRequired(false)
    await engine.syncNow()
    const snap = await engine.getSnapshot()
    expect(snap.status).toBe('DEVICE_PENDING')
    expect(snap.lastError).toBe('Device not registered')
  })

  it('concurrent syncNow calls share one in-flight cycle', async () => {
    await activateLocalWorkspace(USER, 'c1')
    tokenStorage.setDeviceId('device-ux')
    let pulls = 0
    vi.mocked(syncControllerPull).mockImplementation(async () => {
      pulls += 1
      await new Promise((r) => setTimeout(r, 40))
      return {
        cursor: null,
        nextCursor: null,
        hasMore: false,
        limit: 500,
        created: emptyBuckets(),
        updated: emptyBuckets(),
        deleted: emptyBuckets(),
      }
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      status: 'applied',
      operations: [],
    } as never)
    const engine = resetSyncEngineForTests(getLocalStore())
    await Promise.all([engine.syncNow(), engine.syncNow(), engine.syncNow()])
    expect(pulls).toBe(1)
  })

  it('push batch never exceeds 500 even with 1000 pending ops', async () => {
    await activateLocalWorkspace(USER, 'c1')
    for (let i = 0; i < 1000; i += 1) {
      await getLocalStore().enqueueOperation({
        clientOperationId: createUuid(),
        entityType: 'attendance_record',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
      })
    }
    const batch = await selectPushBatch(getLocalStore(), {
      ownerUserId: USER,
      max: MAX_PUSH_BATCH,
    })
    expect(batch.length).toBe(500)
    expect(new Set(batch.map((o) => o.clientOperationId)).size).toBe(500)
  }, 20_000)

  it('100 pending ops remain unique and selectable', async () => {
    await activateLocalWorkspace(USER, 'c1')
    const ids: string[] = []
    for (let i = 0; i < 100; i += 1) {
      const id = createUuid()
      ids.push(id)
      await getLocalStore().enqueueOperation({
        clientOperationId: id,
        entityType: 'child',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
      })
    }
    expect(new Set(ids).size).toBe(100)
    const batch = await selectPushBatch(getLocalStore(), { ownerUserId: USER, max: 500 })
    expect(batch.length).toBe(100)
  })

  it('500 pending ops stay pending after failed sync', async () => {
    await activateLocalWorkspace(USER, 'c1')
    for (let i = 0; i < 500; i += 1) {
      await getLocalStore().enqueueOperation({
        clientOperationId: createUuid(),
        entityType: 'referral',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
      })
    }
    tokenStorage.setDeviceId('device-ux')
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockRejectedValue(new Error('server down'))
    const engine = resetSyncEngineForTests(getLocalStore())
    await engine.syncNow()
    const snap = await engine.getSnapshot()
    expect(snap.status).toBe('SYNC_ERROR')
    expect(await getLocalStore().countOperations(['pending'], { ownerUserId: USER })).toBe(500)
  }, 20_000)

  it('cold start restores lastSyncedAt meta from user workspace', async () => {
    await activateLocalWorkspace(USER, 'c1')
    await getLocalStore().setMeta(META_KEYS.lastSyncedAt, '2026-08-10T08:42:00.000Z')
    await getLocalStore().setMeta(META_KEYS.hasLocalSnapshot, 'true')
    await deactivateLocalWorkspace()
    await activateLocalWorkspace(USER, 'c1')
    expect(await getLocalStore().getMeta(META_KEYS.lastSyncedAt)).toBe(
      '2026-08-10T08:42:00.000Z',
    )
    expect(await getLocalStore().getMeta(META_KEYS.hasLocalSnapshot)).toBe('true')
  })

  it('conflict count surfaces in sync snapshot', async () => {
    await activateLocalWorkspace(USER, 'c1')
    await getLocalStore().enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'update',
      entityId: createUuid(),
      version: 1,
      status: 'conflict',
      lastError: 'version mismatch',
    })
    const engine = resetSyncEngineForTests(getLocalStore())
    const snap = await engine.getSnapshot()
    expect(snap.conflictCount).toBe(1)
    expect(snap.status).toBe('CONFLICT_PRESENT')
  })
})
