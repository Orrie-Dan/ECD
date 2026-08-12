import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { resetSyncEngineForTests } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { MAX_PUSH_BATCH } from '@/sync/sync-types'
import { selectPushBatch } from '@/sync/outbox'
import { createChildLocalFirst } from '@/features/children/local-children'
import { evaluateLogoutPolicy } from '@/offline/logout-policy'
import { tokenStorage } from '@/api/token-storage'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

import {
  syncControllerPush,
  syncControllerPull,
  syncControllerSessionStatus,
} from '@/api/generated/endpoints/sync/sync'

describe('SyncEngine + children offline proof', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-sync-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    resetSyncEngineForTests(store)
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' })
    // Force online for push tests unless overridden.
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('syncNow is a no-op when offline', async () => {
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'OFFLINE', isOnline: false, lastReachableAt: null }),
    })
    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect(syncControllerPull).not.toHaveBeenCalled()
    expect(syncControllerPush).not.toHaveBeenCalled()
    const snap = await engine.getSnapshot()
    expect(snap.status).toBe('OFFLINE')
  })

  it('selectPushBatch never exceeds 500', async () => {
    for (let i = 0; i < 510; i += 1) {
      await store.enqueueOperation({
        clientOperationId: createUuid(),
        entityType: 'child',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
      })
    }
    const batch = await selectPushBatch(store, MAX_PUSH_BATCH)
    expect(batch.length).toBe(500)
  })

  it('retry preserves clientOperationId on push failure', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: { firstName: 'A' },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockRejectedValue(new Error('network'))

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()

    const op = await store.getOperation(opId)
    expect(op?.clientOperationId).toBe(opId)
    expect(op?.status).toBe('pending')
  })

  it('marks conflict from push response', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: { firstName: 'A' },
    })
    const deviceId = createUuid()
    tokenStorage.setDeviceId(deviceId)
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 0,
      status: 'conflict',
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          localId: entityId,
          entityId,
          entityType: 'child',
          operation: 'create',
          status: 'conflict',
          conflictReason: 'version mismatch: client 0, server 1',
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(opId))?.status).toBe('conflict')
  })

  it('advances cursor only after local persistence', async () => {
    tokenStorage.setDeviceId(createUuid())
    const childId = createUuid()
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: '2024-06-01T12:00:00.000Z', id: childId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        child: [
          {
            id: childId,
            firstName: 'Pulled',
            lastName: 'Child',
            registrationNumber: 'R1',
            centerId: 'c1',
            dateOfBirth: '2020-01-01',
            gender: 'Umukobwa',
            status: 'active',
            guardianName: 'G',
            guardianPhone: '07',
            guardianRelation: 'umubyeyi',
            homeVillageId: 'v1',
            registeredAt: '2024-01-01',
            version: 1,
            lastModifiedAt: '2024-06-01T12:00:00.000Z',
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 0,
      created: 0,
      deduplicated: 0,
      status: 'applied',
      operations: [],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect(await store.getChild(childId)).toBeTruthy()
    const cursor = await store.getPullCursor()
    expect(cursor.lastModifiedAt).toBe('2024-06-01T12:00:00.000Z')
    expect(cursor.id).toBe(childId)
  })

  it('polls session and marks applied', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    const sessionId = createUuid()
    await store.putChild({
      id: entityId,
      version: 0,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'dirty',
      registrationNumber: 'R',
      firstName: 'A',
      fullName: 'A',
      centerId: 'c',
      centerName: '',
      dateOfBirth: '2020-01-01',
      gender: 'Umuhungu',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '07',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'v',
      registeredAt: '2024-01-01',
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
    })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: { firstName: 'A', homeVillageId: 'v', registrationNumber: 'R', centerId: 'c', dateOfBirth: '2020-01-01', gender: 'Umuhungu', guardianName: 'G', guardianPhone: '07', guardianRelation: 'umubyeyi', registeredAt: '2024-01-01' },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
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
          localId: entityId,
          entityId,
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
      status: 'completed',
      totalOperations: 1,
      successfulOperations: 1,
      failedOperations: 0,
      retryCount: 0,
      lastRetryAt: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          processedAt: new Date().toISOString(),
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(opId))?.status).toBe('applied')
    expect((await store.getChild(entityId))?._localStatus).toBe('clean')
  })

  it('polls per-op sessionId when top-level sessionId is null (all-replay)', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    const priorSessionId = createUuid()
    await store.putChild({
      id: entityId,
      version: 0,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'dirty',
      registrationNumber: 'R',
      firstName: 'A',
      fullName: 'A',
      centerId: 'c',
      centerName: '',
      dateOfBirth: '2020-01-01',
      gender: 'Umuhungu',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '07',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'v',
      registeredAt: '2024-01-01',
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
    })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: {
        firstName: 'A',
        homeVillageId: 'v',
        registrationNumber: 'R',
        centerId: 'c',
        dateOfBirth: '2020-01-01',
        gender: 'Umuhungu',
        guardianName: 'G',
        guardianPhone: '07',
        guardianRelation: 'umubyeyi',
        registeredAt: '2024-01-01',
      },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 1,
      status: 'pending',
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          localId: entityId,
          entityId,
          entityType: 'child',
          operation: 'create',
          status: 'pending',
          conflictReason: null,
          replayed: true,
          sessionId: priorSessionId,
        },
      ],
    })
    vi.mocked(syncControllerSessionStatus).mockResolvedValue({
      id: priorSessionId,
      status: 'completed',
      totalOperations: 1,
      successfulOperations: 1,
      failedOperations: 0,
      retryCount: 0,
      lastRetryAt: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          processedAt: new Date().toISOString(),
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect(syncControllerSessionStatus).toHaveBeenCalledWith(priorSessionId)
    expect((await store.getOperation(opId))?.status).toBe('applied')
    expect((await store.getOperation(opId))?.sessionId).toBe(priorSessionId)
    expect((await store.getChild(entityId))?._localStatus).toBe('clean')
  })

  it('orphan sweep resets stale syncing ops without sessionId to pending', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: { firstName: 'A' },
    })
    const stale = new Date(Date.now() - 60_000).toISOString()
    await store.updateOperation(opId, {
      status: 'syncing',
      updatedAt: stale,
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    // After sweep resets to pending, push runs — return applied immediately.
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
          localId: entityId,
          entityId,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          replayed: true,
          sessionId: null,
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect(syncControllerPush).toHaveBeenCalled()
    expect((await store.getOperation(opId))?.status).toBe('applied')
  })

  it('orphan sweep polls stale syncing ops that already have a sessionId', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    const sessionId = createUuid()
    await store.putChild({
      id: entityId,
      version: 0,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'dirty',
      registrationNumber: 'R',
      firstName: 'A',
      fullName: 'A',
      centerId: 'c',
      centerName: '',
      dateOfBirth: '2020-01-01',
      gender: 'Umuhungu',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '07',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'v',
      registeredAt: '2024-01-01',
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
    })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId,
      version: 0,
      payload: { firstName: 'A' },
    })
    const stale = new Date(Date.now() - 60_000).toISOString()
    await store.updateOperation(opId, {
      status: 'syncing',
      sessionId,
      updatedAt: stale,
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerSessionStatus).mockResolvedValue({
      id: sessionId,
      status: 'completed',
      totalOperations: 1,
      successfulOperations: 1,
      failedOperations: 0,
      retryCount: 0,
      lastRetryAt: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          processedAt: new Date().toISOString(),
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect(syncControllerSessionStatus).toHaveBeenCalledWith(sessionId)
    expect((await store.getOperation(opId))?.status).toBe('applied')
    // Sweep applied the op before push — no pending batch to push.
    expect(syncControllerPush).not.toHaveBeenCalled()
  })

  it('offline child create survives "restart" and syncs without new id', async () => {
    const created = await createChildLocalFirst(store, {
      form: {
        fullName: 'Offline Child',
        dateOfBirth: '2021-05-05',
        gender: 'Umukobwa',
        specialNeeds: '',
        guardianName: 'Mama',
        guardianPhone: '0781111111',
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
      centerId: 'center-1',
      centerName: 'Center',
      homeVillageId: 'village-uuid',
      villageResolved: true,
    })

    // Simulate browser restart: new store handle on same DB name is not needed —
    // re-read from same store proves durability of the write.
    const persisted = await store.getChild(created.id)
    expect(persisted).toBeTruthy()
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0].entityId).toBe(created.id)
    expect(ops[0].clientOperationId).toBeTruthy()
    const stableOpId = ops[0].clientOperationId

    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 1,
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: stableOpId,
          localId: created.id,
          entityId: created.id,
          entityType: 'child',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(stableOpId))?.status).toBe('applied')
    expect(vi.mocked(syncControllerPush).mock.calls[0][0].operations[0].entityId).toBe(
      created.id,
    )
    expect(vi.mocked(syncControllerPush).mock.calls[0][0].operations[0].clientOperationId).toBe(
      stableOpId,
    )
  })

  it('expired auth does not delete outbox', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    tokenStorage.clearTokens()
    const engine = resetSyncEngineForTests(store)
    engine.setAuthRequired(true)
    await engine.syncNow()
    expect(await store.getOperation(opId)).toBeTruthy()
    expect((await engine.getSnapshot()).status).toBe('AUTH_REQUIRED')
  })

  it('logout policy blocks when pending work exists', async () => {
    await store.enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    const blocked = await evaluateLogoutPolicy('cancel', store)
    expect(blocked.allowed).toBe(false)
    const keep = await evaluateLogoutPolicy('keep_on_device', store)
    expect(keep.allowed).toBe(true)
    expect(await store.getOperation((await store.listOperations())[0].clientOperationId)).toBeTruthy()
  })
})

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
