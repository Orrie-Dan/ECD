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
import { pullOnce } from '@/sync/pull'
import { inferAppliedVersion } from '@/sync/apply-local'
import {
  softDeleteAttendanceLocalFirst,
  upsertAttendanceLocalFirst,
} from '@/features/attendance/local-attendance'
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

describe('Attendance offline sync integration', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-att-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    resetSyncEngineForTests(store)
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' })
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('records 20 offline attendance rows that survive restart and sync with stable ids', async () => {
    const centerId = createUuid()
    const recordedBy = createUuid()
    const date = '2026-08-10'
    const childIds = Array.from({ length: 20 }, () => createUuid())

    for (const childId of childIds) {
      await upsertAttendanceLocalFirst(store, {
        childId,
        date,
        present: true,
        centerId,
        recordedBy,
        broughtBy: 'umubyeyi_mama',
        arrivedAt: `${date}T08:00:00.000Z`,
      })
    }

    // "Browser restart" simulation: re-read durable LocalStore (same IndexedDB).
    const rows = await store.listAttendance({ centerId })
    expect(rows).toHaveLength(20)
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(20)
    const stableIds = ops.map((o) => o.clientOperationId)

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
      accepted: 20,
      created: 20,
      deduplicated: 0,
      status: 'applied',
      operations: ops.map((op) => ({
        id: createUuid(),
        clientOperationId: op.clientOperationId,
        localId: op.entityId,
        entityId: op.entityId,
        entityType: 'attendance_record' as const,
        operation: 'create' as const,
        status: 'applied' as const,
        conflictReason: null,
        replayed: false,
        sessionId: null,
      })),
    })

    await resetSyncEngineForTests(store).syncNow()

    for (const opId of stableIds) {
      expect((await store.getOperation(opId))?.status).toBe('applied')
    }
    for (const row of await store.listAttendance({ centerId })) {
      expect(row._localStatus).toBe('clean')
      expect(row.version).toBeGreaterThanOrEqual(1)
    }
    const pushed = vi.mocked(syncControllerPush).mock.calls[0][0].operations
    expect(pushed).toHaveLength(20)
    expect(pushed.every((o) => stableIds.includes(o.clientOperationId))).toBe(true)
  })

  it('network failure after local save restores pending without new clientOperationId', async () => {
    const result = await upsertAttendanceLocalFirst(store, {
      childId: createUuid(),
      date: '2026-08-10',
      present: true,
      centerId: createUuid(),
      recordedBy: createUuid(),
    })
    const op = (await store.listOperations({ status: 'pending' }))[0]
    const opId = op.clientOperationId

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
    vi.mocked(syncControllerPush).mockRejectedValue(new Error('network gone'))

    await resetSyncEngineForTests(store).syncNow()

    expect(await store.getAttendance(result.record.id)).toBeTruthy()
    const after = await store.getOperation(opId)
    expect(after?.clientOperationId).toBe(opId)
    expect(after?.status).toBe('pending')
    expect(await store.listOperations({ status: 'pending' })).toHaveLength(1)
  })

  it('duplicate retries reuse the same clientOperationId', async () => {
    await upsertAttendanceLocalFirst(store, {
      childId: createUuid(),
      date: '2026-08-11',
      present: false,
      absentReason: 'sick',
      centerId: createUuid(),
      recordedBy: createUuid(),
    })
    const opId = (await store.listOperations({ status: 'pending' }))[0].clientOperationId
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
    vi.mocked(syncControllerPush).mockRejectedValue(new Error('fail'))

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    await engine.syncNow()
    await engine.syncNow()

    const ops = await store.listOperations()
    expect(ops.filter((o) => o.clientOperationId === opId)).toHaveLength(1)
    expect(ops.filter((o) => o.status === 'pending')).toHaveLength(1)
  })

  it('CAS conflict surfaces and pull applies server record (no silent LWW)', async () => {
    const entityId = createUuid()
    const childId = createUuid()
    const centerId = createUuid()
    const now = new Date().toISOString()
    await store.putAttendance({
      id: entityId,
      childId,
      centerId,
      date: '2026-08-10',
      present: true,
      recordedBy: createUuid(),
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
      notes: 'device-b-local',
    })

    await upsertAttendanceLocalFirst(store, {
      childId,
      date: '2026-08-10',
      present: false,
      absentReason: 'family',
      centerId,
      recordedBy: createUuid(),
      notes: 'device-b-offline-edit',
    })
    const op = (await store.listOperations({ status: 'pending' }))[0]
    expect(op.version).toBe(1)

    tokenStorage.setDeviceId(createUuid())
    const serverRow = {
      id: entityId,
      childId,
      centerId,
      attendanceDate: '2026-08-10',
      status: 'present',
      present: true,
      notes: 'device-a-server-v2',
      recordedById: createUuid(),
      version: 2,
      deletedAt: null,
      lastModifiedAt: '2026-08-10T12:00:00.000Z',
      broughtBy: 'umubyeyi_mama',
      arrivedAt: '2026-08-10T07:30:00.000Z',
    }

    vi.mocked(syncControllerPull)
      .mockResolvedValueOnce({
        cursor: null,
        nextCursor: null,
        hasMore: false,
        limit: 500,
        created: emptyBuckets(),
        updated: emptyBuckets(),
        deleted: emptyBuckets(),
      })
      .mockResolvedValueOnce({
        cursor: null,
        nextCursor: {
          lastModifiedAt: serverRow.lastModifiedAt,
          id: entityId,
        },
        hasMore: false,
        limit: 500,
        created: emptyBuckets(),
        updated: {
          ...emptyBuckets(),
          attendance_record: [serverRow],
        },
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
          clientOperationId: op.clientOperationId,
          localId: entityId,
          entityId,
          entityType: 'attendance_record',
          operation: 'update',
          status: 'conflict',
          conflictReason: 'version mismatch: client 1, server 2',
          replayed: false,
          sessionId: null,
        },
      ],
    })

    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()

    expect((await store.getOperation(op.clientOperationId))?.status).toBe('conflict')
    expect((await engine.getSnapshot()).conflictCount).toBe(1)
    expect((await engine.getSnapshot()).status).toBe('CONFLICT_PRESENT')

    const local = await store.getAttendance(entityId)
    // Server wins for local projection; conflict op retained with user payload.
    expect(local?.notes).toBe('device-a-server-v2')
    expect(local?._localStatus).toBe('clean')
    expect(local?.version).toBe(2)
    expect(op.payload?.notes).toBe('device-b-offline-edit')
  })

  it('offline delete syncs with CAS version', async () => {
    const entityId = createUuid()
    const childId = createUuid()
    const now = new Date().toISOString()
    await store.putAttendance({
      id: entityId,
      childId,
      centerId: 'c1',
      date: '2026-08-10',
      present: true,
      recordedBy: 'u1',
      version: 4,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
    await softDeleteAttendanceLocalFirst(store, childId, '2026-08-10')
    const op = (await store.listOperations({ status: 'pending' }))[0]
    expect(op.operation).toBe('delete')
    expect(op.version).toBe(4)

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
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: op.clientOperationId,
          localId: entityId,
          entityId,
          entityType: 'attendance_record',
          operation: 'delete',
          status: 'applied',
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(op.clientOperationId))?.status).toBe('applied')
    expect((await store.getAttendance(entityId))?._localStatus).toBe('clean')
    expect((await store.getAttendance(entityId))?.version).toBe(5)
  })

  it('push batch for attendance never exceeds 500', async () => {
    for (let i = 0; i < 510; i += 1) {
      await store.enqueueOperation({
        clientOperationId: createUuid(),
        entityType: 'attendance_record',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
      })
    }
    const batch = await selectPushBatch(store, MAX_PUSH_BATCH)
    expect(batch.length).toBe(500)
  })

  it('pull applies attendance before advancing cursor (identical timestamps)', async () => {
    const t = '2026-08-10T10:00:00.000Z'
    const idA = createUuid()
    const idB = createUuid()
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: t, id: idB },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        attendance_record: [
          {
            id: idA,
            childId: createUuid(),
            centerId: 'c1',
            attendanceDate: '2026-08-10',
            status: 'present',
            recordedById: createUuid(),
            version: 1,
            lastModifiedAt: t,
            deletedAt: null,
          },
          {
            id: idB,
            childId: createUuid(),
            centerId: 'c1',
            attendanceDate: '2026-08-10',
            status: 'absent',
            absentReason: 'sick',
            recordedById: createUuid(),
            version: 1,
            lastModifiedAt: t,
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store, { deviceId: tokenStorage.getDeviceId()! })
    expect(await store.getAttendance(idA)).toBeTruthy()
    expect(await store.getAttendance(idB)).toBeTruthy()
    const cursor = await store.getPullCursor()
    expect(cursor.lastModifiedAt).toBe(t)
    expect(cursor.id).toBe(idB)
  })

  it('infers applied version for create/update/delete', () => {
    const base = {
      clientOperationId: 'x',
      entityType: 'attendance_record' as const,
      entityId: 'e',
      clientTimestamp: '',
      status: 'applied' as const,
      dependsOn: [],
      attempts: 1,
      ownerUserId: 'test-owner-user',
      createdAt: '',
      updatedAt: '',
    }
    expect(
      inferAppliedVersion({ ...base, operation: 'create', version: 0 }),
    ).toBe(1)
    expect(
      inferAppliedVersion({ ...base, operation: 'update', version: 3 }),
    ).toBe(4)
    expect(
      inferAppliedVersion({ ...base, operation: 'delete', version: 2 }),
    ).toBe(3)
  })

  it('session poll marks attendance applied with version bump', async () => {
    const opId = createUuid()
    const entityId = createUuid()
    const sessionId = createUuid()
    const now = new Date().toISOString()
    await store.putAttendance({
      id: entityId,
      childId: createUuid(),
      centerId: 'c',
      date: '2026-08-10',
      present: true,
      recordedBy: 'u',
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId,
      version: 0,
      payload: { present: true },
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
          entityType: 'attendance_record',
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
      startedAt: now,
      completedAt: now,
      operations: [
        {
          id: createUuid(),
          clientOperationId: opId,
          entityType: 'attendance_record',
          operation: 'create',
          status: 'applied',
          conflictReason: null,
          processedAt: now,
        },
      ],
    })

    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(opId))?.status).toBe('applied')
    expect((await store.getAttendance(entityId))?._localStatus).toBe('clean')
    expect((await store.getAttendance(entityId))?.version).toBe(1)
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
