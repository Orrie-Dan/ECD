import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  ensureLocalStoreInitialized,
  META_KEYS,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import {
  softDeleteAttendanceLocalFirst,
  upsertAttendanceLocalFirst,
} from '@/features/attendance/local-attendance'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'

describe('LocalStore', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-store-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await ensureLocalStoreInitialized(store)
    await bindTestOwner(store)
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('persists metadata', async () => {
    await store.setMeta(META_KEYS.userId, 'user-1')
    expect(await store.getMeta(META_KEYS.userId)).toBe('user-1')
    expect(await store.getMeta(META_KEYS.schemaVersion)).toBe('6')
  })

  it('creates and reads children', async () => {
    const now = new Date().toISOString()
    await store.putChild({
      id: 'child-1',
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      registrationNumber: 'REG-1',
      firstName: 'Aline',
      lastName: 'Uwase',
      fullName: 'Aline Uwase',
      centerId: 'center-1',
      centerName: 'Center',
      dateOfBirth: '2020-01-01',
      gender: 'Umukobwa',
      status: 'active',
      guardianName: 'Parent',
      guardianPhone: '0780000000',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'village-1',
      registeredAt: '2024-01-01',
      province: 'p',
      district: 'd',
      sector: 's',
      cell: 'c',
      village: 'v',
    })
    const found = await store.getChild('child-1')
    expect(found?.fullName).toBe('Aline Uwase')
    const list = await store.listChildren({ centerId: 'center-1' })
    expect(list).toHaveLength(1)
  })

  it('runs atomic child + outbox transaction', async () => {
    const childId = createUuid()
    const opId = createUuid()
    await store.runTransaction(['children', 'sync_operations'], 'rw', async (tx) => {
      await tx.putChild({
        id: childId,
        version: 0,
        deletedAt: null,
        lastModifiedAt: new Date().toISOString(),
        _localStatus: 'dirty',
        registrationNumber: 'REG-X',
        firstName: 'Jean',
        fullName: 'Jean',
        centerId: 'c1',
        centerName: '',
        dateOfBirth: '2019-01-01',
        gender: 'Umuhungu',
        status: 'active',
        guardianName: 'G',
        guardianPhone: '07',
        guardianRelation: 'umubyeyi',
        homeVillageId: 'v1',
        registeredAt: '2024-01-01',
        province: '',
        district: '',
        sector: '',
        cell: '',
        village: '',
      })
      await tx.enqueueOperation({
        clientOperationId: opId,
        entityType: 'child',
        operation: 'create',
        entityId: childId,
        version: 0,
        payload: { firstName: 'Jean' },
      })
    })
    expect(await store.getChild(childId)).toBeTruthy()
    expect(await store.getOperation(opId)).toMatchObject({ status: 'pending', entityId: childId })
  })

  it('persists and restores pull cursor', async () => {
    await store.setPullCursor({ lastModifiedAt: '2024-01-01T00:00:00.000Z', id: 'abc' })
    expect(await store.getPullCursor()).toEqual({
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      id: 'abc',
    })
  })

  it('inserts attendance and enforces natural key lookup', async () => {
    const now = new Date().toISOString()
    const id = createUuid()
    await store.putAttendance({
      id,
      childId: 'child-a',
      centerId: 'center-1',
      date: '2026-08-10',
      present: true,
      recordedBy: 'user-1',
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
    const found = await store.getAttendanceByNaturalKey('child-a', '2026-08-10')
    expect(found?.id).toBe(id)
    expect(found?.present).toBe(true)
  })

  it('attendance upsert + outbox are atomic and reuse natural key', async () => {
    const first = await upsertAttendanceLocalFirst(store, {
      childId: 'child-1',
      date: '2026-08-10',
      present: true,
      centerId: 'center-1',
      recordedBy: createUuid(),
      broughtBy: 'umubyeyi_mama',
      arrivedAt: '2026-08-10T08:00:00.000Z',
    })
    const second = await upsertAttendanceLocalFirst(store, {
      childId: 'child-1',
      date: '2026-08-10',
      present: false,
      absentReason: 'sick',
      centerId: 'center-1',
      recordedBy: createUuid(),
    })
    expect(second.record.id).toBe(first.record.id)
    const rows = await store.listAttendance({ centerId: 'center-1', includeDeleted: true })
    expect(rows.filter((r) => r.childId === 'child-1' && r.date === '2026-08-10')).toHaveLength(1)
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0].entityId).toBe(first.record.id)
    expect(ops[0].operation).toBe('create')
  })

  it('attendance update preserves server version for CAS', async () => {
    const now = new Date().toISOString()
    const id = createUuid()
    await store.putAttendance({
      id,
      childId: 'child-2',
      centerId: 'c1',
      date: '2026-08-09',
      present: true,
      recordedBy: 'u1',
      version: 3,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
    await upsertAttendanceLocalFirst(store, {
      childId: 'child-2',
      date: '2026-08-09',
      present: false,
      absentReason: 'family',
      centerId: 'c1',
      recordedBy: 'u1',
    })
    const op = (await store.listOperations({ status: 'pending' }))[0]
    expect(op.operation).toBe('update')
    expect(op.version).toBe(3)
  })

  it('attendance delete marks pending_delete and enqueues delete op', async () => {
    const now = new Date().toISOString()
    const id = createUuid()
    await store.putAttendance({
      id,
      childId: 'child-3',
      centerId: 'c1',
      date: '2026-08-10',
      present: true,
      recordedBy: 'u1',
      version: 2,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })
    await softDeleteAttendanceLocalFirst(store, 'child-3', '2026-08-10')
    const row = await store.getAttendance(id)
    expect(row?._localStatus).toBe('pending_delete')
    expect(row?.deletedAt).toBeTruthy()
    const visible = await store.listAttendance({ centerId: 'c1' })
    expect(visible.find((r) => r.id === id)).toBeUndefined()
    const op = (await store.listOperations({ status: 'pending' }))[0]
    expect(op.operation).toBe('delete')
    expect(op.version).toBe(2)
    expect(op.entityId).toBe(id)
  })

  it('enqueueOperation coalescing preserves attempts', async () => {
    const opId = createUuid()
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    await store.updateOperation(opId, { attempts: 2, status: 'pending' })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      payload: { present: true },
    })
    const op = await store.getOperation(opId)
    expect(op?.attempts).toBe(2)
    expect(op?.payload).toEqual({ present: true })
  })

  it('nutrition screening create + history ordering + multi-history', async () => {
    const { createScreeningLocalFirst } = await import(
      '@/features/nutrition/local-screenings'
    )
    const childId = createUuid()
    const centerId = createUuid()
    const recordedById = createUuid()

    await createScreeningLocalFirst(store, {
      childId,
      centerId,
      date: '2026-07-01',
      weightKg: 12,
      muacCm: 14,
      recordedById,
    })
    await createScreeningLocalFirst(store, {
      childId,
      centerId,
      date: '2026-08-01',
      weightKg: 12.5,
      muacCm: 14.2,
      recordedById,
    })

    const rows = await store.listNutritionScreenings({ childId })
    expect(rows).toHaveLength(2)
    expect(rows[0].screeningDate).toBe('2026-08-01')
    expect(rows[1].screeningDate).toBe('2026-07-01')
  })

  it('atomic screening + outbox (+ referral dependency when severe)', async () => {
    const { createScreeningLocalFirst } = await import(
      '@/features/nutrition/local-screenings'
    )
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0, // severe → referral
      recordedById: createUuid(),
    })

    expect(result.savedOnDevice).toBe(true)
    expect(await store.getNutritionScreening(result.screening.id)).toBeTruthy()
    const screeningOp = await store.getOperation(result.screeningOperationId)
    expect(screeningOp?.status).toBe('pending')
    expect(screeningOp?.entityType).toBe('child_nutrition_screening')
    expect(screeningOp?.operation).toBe('create')

    expect(result.referral).toBeTruthy()
    expect(result.referralOperationId).toBeTruthy()
    const referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('blocked')
    expect(referralOp?.dependsOn).toEqual([result.screeningOperationId])
    expect(referralOp?.payload?.sourceId).toBe(result.screening.id)
  })

  it('feeding day natural-key upsert + month summary natural-key', async () => {
    const {
      upsertFeedingDayLocalFirst,
      upsertFeedingMonthSummaryLocalFirst,
    } = await import('@/features/feeding/local-feeding')
    const centerId = createUuid()
    const recordedById = createUuid()

    const first = await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      recordedById,
    })
    const second = await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: true,
      balancedMealServed: false,
      recordedById,
    })
    expect(second.record.id).toBe(first.record.id)
    const days = await store.listFeedingDays({ centerId, includeDeleted: true })
    expect(days.filter((d) => d.date === '2026-08-10')).toHaveLength(1)
    const dayOps = await store.listOperations({ status: 'pending' })
    expect(
      dayOps.filter((o) => o.entityType === 'center_feeding_day'),
    ).toHaveLength(1)
    expect(dayOps[0].operation).toBe('create')

    const sum1 = await upsertFeedingMonthSummaryLocalFirst(store, {
      centerId,
      yearMonth: '2026-08',
      milkLiters: 10,
      flourKg: 5,
      foodSource: 'Center',
      updatedById: recordedById,
    })
    const sum2 = await upsertFeedingMonthSummaryLocalFirst(store, {
      centerId,
      yearMonth: '2026-08',
      milkLiters: 12,
      flourKg: 6,
      foodSource: 'Center',
      updatedById: recordedById,
    })
    expect(sum2.record.id).toBe(sum1.record.id)
    expect(
      (await store.listFeedingMonthSummaries({ centerId })).filter(
        (s) => s.yearMonth === '2026-08',
      ),
    ).toHaveLength(1)
  })
})
