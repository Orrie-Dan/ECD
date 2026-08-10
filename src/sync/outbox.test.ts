import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import {
  isOperationReady,
  refreshBlockedOperations,
  selectPushBatch,
} from '@/sync/outbox'
import type { SyncOperationRecord } from '@/storage/types'
import { upsertAttendanceLocalFirst } from '@/features/attendance/local-attendance'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'

describe('Outbox', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-outbox-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('enqueues with stable clientOperationId', async () => {
    const id = createUuid()
    const op = await store.enqueueOperation({
      clientOperationId: id,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    expect(op.clientOperationId).toBe(id)
    const again = await store.getOperation(id)
    expect(again?.clientOperationId).toBe(id)
  })

  it('blocks operations with unmet dependencies', async () => {
    const dep = createUuid()
    const child = createUuid()
    await store.enqueueOperation({
      clientOperationId: dep,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      status: 'pending',
    })
    await store.enqueueOperation({
      clientOperationId: child,
      entityType: 'referral',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      status: 'pending',
      dependsOn: [dep],
    })

    await refreshBlockedOperations(store)
    const referral = await store.getOperation(child)
    expect(referral?.status).toBe('blocked')

    const batch = await selectPushBatch(store)
    expect(batch.map((o) => o.clientOperationId)).toEqual([dep])
  })

  it('unblocks when dependency is applied', async () => {
    const dep = createUuid()
    const child = createUuid()
    await store.enqueueOperation({
      clientOperationId: dep,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      status: 'applied',
    })
    await store.enqueueOperation({
      clientOperationId: child,
      entityType: 'referral',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      status: 'blocked',
      dependsOn: [dep],
    })
    await refreshBlockedOperations(store)
    expect((await store.getOperation(child))?.status).toBe('pending')
  })

  it('preserves operation id across status transitions (retry)', async () => {
    const id = createUuid()
    await store.enqueueOperation({
      clientOperationId: id,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    await store.updateOperation(id, { status: 'syncing', attempts: 1 })
    await store.updateOperation(id, { status: 'pending', attempts: 1 })
    const op = await store.getOperation(id)
    expect(op?.clientOperationId).toBe(id)
    expect(op?.attempts).toBe(1)
  })

  it('isOperationReady respects applied deps only', () => {
    const depId = 'dep'
    const byId = new Map<string, SyncOperationRecord>()
    byId.set(depId, {
      clientOperationId: depId,
      entityType: 'child',
      operation: 'create',
      entityId: 'e1',
      version: 0,
      clientTimestamp: '',
      status: 'pending',
      dependsOn: [],
      attempts: 0,
      ownerUserId: 'test-owner-user',
      createdAt: '',
      updatedAt: '',
    })
    const op: SyncOperationRecord = {
      clientOperationId: 'op',
      entityType: 'referral',
      operation: 'create',
      entityId: 'e2',
      version: 0,
      clientTimestamp: '',
      status: 'pending',
      dependsOn: [depId],
      attempts: 0,
      ownerUserId: 'test-owner-user',
      createdAt: '',
      updatedAt: '',
    }
    expect(isOperationReady(op, byId)).toBe(false)
    byId.set(depId, { ...byId.get(depId)!, status: 'applied' })
    expect(isOperationReady(op, byId)).toBe(true)
  })

  it('attendance create/update/delete enqueue correct operations', async () => {
    const created = await upsertAttendanceLocalFirst(store, {
      childId: 'c1',
      date: '2026-08-10',
      present: true,
      centerId: 'center',
      recordedBy: createUuid(),
    })
    let ops = await store.listOperations({ status: 'pending' })
    expect(ops[0].operation).toBe('create')
    expect(ops[0].entityType).toBe('attendance_record')

    // Simulate applied create with server version
    await store.markAttendanceClean(created.record.id, 1)
    await store.updateOperation(ops[0].clientOperationId, { status: 'applied' })

    await upsertAttendanceLocalFirst(store, {
      childId: 'c1',
      date: '2026-08-10',
      present: false,
      absentReason: 'weather',
      centerId: 'center',
      recordedBy: createUuid(),
    })
    ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0].operation).toBe('update')
    expect(ops[0].version).toBe(1)

    const updateOpId = ops[0].clientOperationId
    await store.updateOperation(updateOpId, { status: 'applied' })
    await store.markAttendanceClean(created.record.id, 2)

    const { softDeleteAttendanceLocalFirst } = await import(
      '@/features/attendance/local-attendance'
    )
    await softDeleteAttendanceLocalFirst(store, 'c1', '2026-08-10')
    ops = await store.listOperations({ status: 'pending' })
    expect(ops[0].operation).toBe('delete')
    expect(ops[0].version).toBe(2)
  })

  it('attendance retry preserves the same clientOperationId', async () => {
    await upsertAttendanceLocalFirst(store, {
      childId: 'c2',
      date: '2026-08-10',
      present: true,
      centerId: 'center',
      recordedBy: createUuid(),
    })
    const first = (await store.listOperations({ status: 'pending' }))[0]
    const opId = first.clientOperationId
    await store.updateOperation(opId, { status: 'syncing', attempts: 1 })
    await store.updateOperation(opId, { status: 'pending', attempts: 1 })
    await upsertAttendanceLocalFirst(store, {
      childId: 'c2',
      date: '2026-08-10',
      present: true,
      broughtBy: 'umubyeyi_papa',
      centerId: 'center',
      recordedBy: createUuid(),
    })
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0].clientOperationId).toBe(opId)
  })

  it('marks conflict and failed states without dropping the op', async () => {
    const conflictId = createUuid()
    const failedId = createUuid()
    await store.enqueueOperation({
      clientOperationId: conflictId,
      entityType: 'attendance_record',
      operation: 'update',
      entityId: createUuid(),
      version: 1,
    })
    await store.enqueueOperation({
      clientOperationId: failedId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    await store.updateOperation(conflictId, { status: 'conflict', lastError: 'version mismatch' })
    await store.updateOperation(failedId, { status: 'failed', lastError: 'not found' })
    expect(await store.getOperation(conflictId)).toMatchObject({ status: 'conflict' })
    expect(await store.getOperation(failedId)).toMatchObject({ status: 'failed' })
    const ready = await selectPushBatch(store)
    expect(ready.map((o) => o.clientOperationId)).not.toContain(conflictId)
    expect(ready.map((o) => o.clientOperationId)).not.toContain(failedId)
  })
})
