import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { resetSyncEngineForTests } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import { META_KEYS } from '@/storage/types'
import { setPollSessionOptionsForTests } from '@/sync/session'
import { selectPushBatch } from '@/sync/outbox'
import { createChildLocalFirst } from '@/features/children/local-children'
import { upsertAttendanceLocalFirst } from '@/features/attendance/local-attendance'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

vi.mock('@/features/device', async () => {
  const actual = await vi.importActual<typeof import('@/features/device')>('@/features/device')
  return {
    ...actual,
    ensureDeviceRegistered: vi.fn(),
    clearBrowserDeviceIdentity: vi.fn(),
  }
})

import {
  syncControllerPush,
  syncControllerPull,
  syncControllerSessionStatus,
} from '@/api/generated/endpoints/sync/sync'
import { ensureDeviceRegistered } from '@/features/device'

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

describe('Sprint 5.6 sync reliability', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-rel-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    resetSyncEngineForTests(store)
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' })
    setPollSessionOptionsForTests({ maxStallAttempts: 1, intervalMs: 0, maxWallMs: 50 })
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
  })

  afterEach(() => {
    clearTestOwner()
    setPollSessionOptionsForTests(undefined)
  })

  it('offline save succeeds and creates outbox without claiming synced', async () => {
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'OFFLINE', isOnline: false, lastReachableAt: null }),
    })
    const child = await createChildLocalFirst(store, {
      form: {
        fullName: 'Test Child',
        dateOfBirth: '2020-01-01',
        gender: 'Umuhungu',
        nationalId: '1199880012345678',
        specialNeeds: '',
        guardianName: 'G',
        guardianPhone: '07',
        guardianRelation: 'umubyeyi',
        guardian2Name: '',
        guardian2Phone: '',
        guardian2Relation: '',
        province: 'p',
        district: 'd',
        sector: 's',
        cell: 'c',
        village: 'v',
      } as never,
      centerId: 'center',
      centerName: 'Center',
      homeVillageId: 'village-1',
      villageResolved: true,
    })
    expect(child.id).toBeTruthy()
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops.length).toBeGreaterThan(0)
    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect(syncControllerPush).not.toHaveBeenCalled()
    expect(await store.getMeta(META_KEYS.lastSyncedAt)).toBeNull()
    expect((await engine.getSnapshot()).status).toBe('OFFLINE')
  })

  it('poll timeout does not stamp lastSyncedAt or mark ops applied', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      payload: { firstName: 'A', homeVillageId: 'v' },
    })
    const sessionId = createUuid()
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId,
      accepted: 1,
      created: 1,
      deduplicated: 0,
      status: 'pending',
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          localId: null,
          entityId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'pending',
          conflictReason: null,
          replayed: false,
          sessionId,
        },
      ],
    })
    vi.mocked(syncControllerSessionStatus).mockResolvedValue({
      id: sessionId,
      status: 'started',
      totalOperations: 1,
      successfulOperations: 0,
      failedOperations: 0,
      retryCount: 0,
      lastRetryAt: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'pending',
          conflictReason: null,
          processedAt: null,
        },
      ],
    })

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect(await store.getMeta(META_KEYS.lastSyncedAt)).toBeNull()
    const op = await store.getOperation(opId)
    expect(op?.status).not.toBe('applied')
    expect(['syncing', 'pending']).toContain(op?.status)
    const snap = await engine.getSnapshot()
    expect(snap.status).not.toBe('IDLE')
  })

  it('JWT expiry keeps outbox queued and resumes after re-auth', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    const engine = resetSyncEngineForTests(store)
    engine.setAuthRequired(true)
    await engine.syncNow()
    expect((await store.getOperation(opId))?.status).toBe('pending')
    expect((await engine.getSnapshot()).status).toBe('AUTH_REQUIRED')
    expect(syncControllerPush).not.toHaveBeenCalled()

    tokenStorage.setTokens({ accessToken: 'new', refreshToken: 'new' })
    tokenStorage.setDeviceId(createUuid())
    engine.setAuthRequired(false)
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          localId: null,
          entityId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          replayed: true,
          sessionId: null,
        },
      ],
    })
    await engine.syncNow()
    expect((await store.getOperation(opId))?.status).toBe('applied')
  })

  it('403 device ownership preserves operations and blocks sync', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPush).mockRejectedValue({
      statusCode: 403,
      message: 'Device does not belong to the authenticated user',
      messages: ['Device does not belong to the authenticated user'],
      isUnauthorized: false,
      isForbidden: true,
      isConflict: false,
      isNetworkError: false,
      isValidationError: false,
      isNotFound: false,
    })
    vi.mocked(ensureDeviceRegistered).mockResolvedValue({
      ok: false,
      reason: 'error',
      error: 'Device does not belong to the authenticated user',
    })

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect(await store.getOperation(opId)).toBeTruthy()
    expect((await store.getOperation(opId))?.status).not.toBe('applied')
    expect((await engine.getSnapshot()).status).toBe('DEVICE_BLOCKED')
    expect(await store.getMeta(META_KEYS.lastSyncedAt)).toBeNull()
  })

  it('server unavailable does not mark operations synced', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPush).mockRejectedValue({
      statusCode: 503,
      message: 'Redis unavailable',
      messages: ['Redis unavailable'],
      isUnauthorized: false,
      isForbidden: false,
      isConflict: false,
      isNetworkError: false,
      isValidationError: false,
      isNotFound: false,
    })

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect((await store.getOperation(opId))?.status).toBe('pending')
    expect((await engine.getSnapshot()).status).toBe('SERVER_UNAVAILABLE')
    expect(await store.getMeta(META_KEYS.lastSyncedAt)).toBeNull()
  })

  it('retryable failed operations are selected for replay', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    await store.updateOperation(opId, {
      status: 'failed',
      lastError: 'RETRYABLE: parent child not yet applied',
    })
    const batch = await selectPushBatch(store, { ownerUserId: 'test-owner-user' })
    expect(batch.map((o) => o.clientOperationId)).toContain(opId)
  })

  it('permanent failed operations are not retried forever', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'sted_assessment',
      operation: 'update',
      entityId: createUuid(),
      version: 1,
    })
    await store.updateOperation(opId, {
      status: 'failed',
      lastError: 'sted_assessment is append-only and cannot be updated',
    })
    const batch = await selectPushBatch(store, { ownerUserId: 'test-owner-user' })
    expect(batch.map((o) => o.clientOperationId)).not.toContain(opId)
    expect((await store.getOperation(opId))?.status).toBe('failed')
  })

  it('attendance waits for unsynced child create via dependsOn', async () => {
    const child = await createChildLocalFirst(store, {
      form: {
        fullName: 'Dep Child',
        dateOfBirth: '2020-01-01',
        gender: 'Umuhungu',
        nationalId: '1200880012345678',
        specialNeeds: '',
        guardianName: 'G',
        guardianPhone: '07',
        guardianRelation: 'umubyeyi',
        guardian2Name: '',
        guardian2Phone: '',
        guardian2Relation: '',
        province: 'p',
        district: 'd',
        sector: 's',
        cell: 'c',
        village: 'v',
      } as never,
      centerId: 'center',
      centerName: 'Center',
      homeVillageId: 'village-1',
      villageResolved: true,
    })
    await upsertAttendanceLocalFirst(store, {
      childId: child.id,
      date: '2026-08-12',
      present: true,
      centerId: 'center',
      recordedBy: createUuid(),
    })
    const ops = await store.listOperations()
    const childOp = ops.find((o) => o.entityType === 'child')
    const attOp = ops.find((o) => o.entityType === 'attendance_record')
    expect(childOp).toBeTruthy()
    expect(attOp?.dependsOn).toEqual([childOp!.clientOperationId])
    const batch = await selectPushBatch(store, { ownerUserId: 'test-owner-user' })
    expect(batch.map((o) => o.entityType)).toEqual(['child'])
  })
})
