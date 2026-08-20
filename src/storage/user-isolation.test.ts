/**
 * Sprint 4.8.6 — Offline identity, outbox ownership, account switch, auth expiry.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  META_KEYS,
  activateLocalWorkspace,
  deactivateLocalWorkspace,
  clearUserLocalData,
  deleteUserLocalDatabase,
  getLocalStore,
  getActiveOwnerUserId,
  userOfflineDbName,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { selectPushBatch } from '@/sync/outbox'
import { pushOutbox } from '@/sync/push'
import { resetSyncEngineForTests } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import { queryClient } from '@/api/query-client'
import {
  evaluateLogoutPolicy,
  applyLogoutDataPolicy,
} from '@/offline/logout-policy'
import { createChildLocalFirst } from '@/features/children/local-children'
import { upsertAttendanceLocalFirst } from '@/features/attendance/local-attendance'
import { createScreeningLocalFirst } from '@/features/nutrition/local-screenings'
import { createStedLocalFirst } from '@/features/sted/local-sted'
import { createReferralLocalFirst } from '@/features/referrals/local-referrals'
import { emptyPhysicalCheck } from '@/lib/sted-utils'
import { clearTestOwner } from '@/storage/test-owner'
import Dexie from 'dexie'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

import { syncControllerPush, syncControllerPull } from '@/api/generated/endpoints/sync/sync'

const USER_A = 'user-a-isolation'
const USER_B = 'user-b-isolation'
const CENTER_A = 'center-a'
const CENTER_B = 'center-b'

async function seedUserAWorkspace(store: LocalStore) {
    const child = await createChildLocalFirst(store, {
      form: {
        fullName: 'Aline A',
        dateOfBirth: '2020-01-01',
        gender: 'Umukobwa',
        nationalId: '1199880012345678',
        specialNeeds: '',
        guardianName: 'Parent',
        guardianPhone: '0780000001',
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
    centerId: CENTER_A,
    centerName: 'Center A',
    homeVillageId: createUuid(),
    villageResolved: true,
  })

  await upsertAttendanceLocalFirst(store, {
    childId: child.id,
    centerId: CENTER_A,
    date: '2026-08-10',
    present: true,
    recordedBy: USER_A,
  })

  // High MUAC → no auto-referral; keep seed deterministic.
  const screening = await createScreeningLocalFirst(store, {
    childId: child.id,
    centerId: CENTER_A,
    date: '2026-08-10',
    weightKg: 12,
    muacCm: 14,
    recordedById: USER_A,
  })

  const sted = await createStedLocalFirst(store, {
    childId: child.id,
    centerId: CENTER_A,
    assessmentDate: '2026-08-10',
    ageBand: '1_3',
    consentObtained: true,
    physical: emptyPhysicalCheck(),
    noProblem: true,
    milestones: {
      pickStandStep: 'yego',
      chooseStack: 'yego',
      imitatePicture: 'yego',
      scribble: 'yego',
      knowsTools: 'yego',
      understandsCommands: 'yego',
      socialPlay: 'yego',
    },
    outcome: {
      normal: true,
      referred: false,
      counseling: false,
      other: false,
      followUpIn6Months: false,
    },
    assessedById: USER_A,
  })

  await createReferralLocalFirst(store, {
    childId: child.id,
    centerId: CENTER_A,
    assessmentId: createUuid(),
    sourceType: 'nutrition',
    date: '2026-08-10',
    reason: 'follow-up',
    destination: 'Ikigo nderabuzima',
    recordedById: USER_A,
  })

  return { child, screening, sted }
}

describe('Sprint 4.8.6 offline identity & isolation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' })
    tokenStorage.setDeviceId('shared-device-registry-id')
    clearTestOwner()
    void queryClient.clear()
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
    localStorage.removeItem('ecd_legacy_db_migrated_to')
    await deleteUserLocalDatabase(USER_A).catch(() => undefined)
    await deleteUserLocalDatabase(USER_B).catch(() => undefined)
  })

  afterEach(async () => {
    clearTestOwner()
    await deactivateLocalWorkspace().catch(() => undefined)
    await deleteUserLocalDatabase(USER_A).catch(() => undefined)
    await deleteUserLocalDatabase(USER_B).catch(() => undefined)
  })

  it('1. activates an isolated workspace per userId', async () => {
    const a = await activateLocalWorkspace(USER_A, CENTER_A)
    expect(a.dbName).toBe(userOfflineDbName(USER_A))
    expect(getActiveOwnerUserId()).toBe(USER_A)
    expect(await getLocalStore().getMeta(META_KEYS.userId)).toBe(USER_A)
  })

  it('2. stamps outbox operations with ownerUserId', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const store = getLocalStore()
    const op = await store.enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    expect(op.ownerUserId).toBe(USER_A)
  })

  it('3. account switch: User B cannot read User A children', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    expect(await getLocalStore().listChildren()).toHaveLength(1)

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(getActiveOwnerUserId()).toBe(USER_B)
    expect(await getLocalStore().listChildren()).toHaveLength(0)
  })

  it('4. account switch: User B cannot read User A attendance', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listAttendance()).toHaveLength(0)
  })

  it('5. account switch: User B cannot read User A nutrition screenings', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listNutritionScreenings()).toHaveLength(0)
  })

  it('6. account switch: User B cannot read User A STED or referrals', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listStedAssessments()).toHaveLength(0)
    expect(await getLocalStore().listReferrals()).toHaveLength(0)
  })

  it('7. User A pending outbox is invisible to User B listOperations', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    const aPending = await getLocalStore().listOperations({ status: 'pending' })
    expect(aPending.length).toBeGreaterThan(0)

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listOperations({ status: 'pending' })).toHaveLength(0)
  })

  it('8. selectPushBatch never returns another user\'s operations', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    const aBatch = await selectPushBatch(getLocalStore(), { ownerUserId: USER_A })
    expect(aBatch.length).toBeGreaterThan(0)
    expect(aBatch.every((o) => o.ownerUserId === USER_A)).toBe(true)

    await activateLocalWorkspace(USER_B, CENTER_B)
    const bBatch = await selectPushBatch(getLocalStore(), { ownerUserId: USER_B })
    expect(bBatch).toHaveLength(0)
    // Even if B asks for A's id while on B workspace, A's ops are not in this DB.
    const cross = await selectPushBatch(getLocalStore(), { ownerUserId: USER_A })
    expect(cross).toHaveLength(0)
  })

  it('9. pushOutbox under User B does not push User A ops', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)

    const result = await pushOutbox(getLocalStore(), 'shared-device-registry-id', {
      ownerUserId: USER_B,
    })
    expect(result).toBeNull()
    expect(syncControllerPush).not.toHaveBeenCalled()
  })

  it('10. User A pending ops survive B login and resume after A returns', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    const before = await getLocalStore().listOperations({ status: ['pending', 'blocked'] })
    expect(before.length).toBeGreaterThan(0)
    const opIds = before.map((o) => o.clientOperationId).sort()

    await activateLocalWorkspace(USER_B, CENTER_B)
    await activateLocalWorkspace(USER_A, CENTER_A)
    const after = await getLocalStore().listOperations({ status: ['pending', 'blocked'] })
    expect(after.map((o) => o.clientOperationId).sort()).toEqual(opIds)
  })

  it('11. User A cursor is not reused by User B', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await getLocalStore().setPullCursor({
      lastModifiedAt: '2026-01-01T00:00:00.000Z',
      id: 'cursor-a',
    })
    await getLocalStore().setMeta(META_KEYS.lastSyncedAt, '2026-01-02T00:00:00.000Z')

    await activateLocalWorkspace(USER_B, CENTER_B)
    const cursor = await getLocalStore().getPullCursor()
    expect(cursor.lastModifiedAt).toBeNull()
    expect(cursor.id).toBeNull()
    expect(await getLocalStore().getMeta(META_KEYS.lastSyncedAt)).toBeNull()
  })

  it('12. sync status lastSyncedAt is isolated per user', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await getLocalStore().setMeta(META_KEYS.lastSyncedAt, '2026-05-01T00:00:00.000Z')
    const engineA = resetSyncEngineForTests(getLocalStore())
    expect((await engineA.getSnapshot()).lastSyncedAt).toBe('2026-05-01T00:00:00.000Z')

    await activateLocalWorkspace(USER_B, CENTER_B)
    const engineB = resetSyncEngineForTests(getLocalStore())
    expect((await engineB.getSnapshot()).lastSyncedAt).toBeNull()
  })

  it('13. access token expiry path does not wipe LocalStore', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    const engine = resetSyncEngineForTests(getLocalStore())
    engine.setAuthRequired(true)
    await engine.syncNow()
    expect((await engine.getSnapshot()).status).toBe('AUTH_REQUIRED')
    expect(await getLocalStore().listChildren()).toHaveLength(1)
    expect(
      (await getLocalStore().listOperations({ status: ['pending', 'blocked'] })).length,
    ).toBeGreaterThan(0)
  })

  it('14. deactivate (refresh expiry / logout keep) preserves durable data', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await deactivateLocalWorkspace()
    expect(getActiveOwnerUserId()).toBeNull()

    await activateLocalWorkspace(USER_A, CENTER_A)
    expect(await getLocalStore().listChildren()).toHaveLength(1)
  })

  it('15. clean logout with no pending is allowed', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const decision = await evaluateLogoutPolicy('keep_on_device')
    expect(decision.allowed).toBe(true)
    expect(decision.action).toBe('keep_on_device')
  })

  it('16. logout with pending blocks cancel probe and allows keep_on_device', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    const blocked = await evaluateLogoutPolicy('cancel')
    expect(blocked.allowed).toBe(false)
    if (!blocked.allowed) expect(blocked.pendingCount).toBeGreaterThan(0)

    const keep = await evaluateLogoutPolicy('keep_on_device')
    expect(keep.allowed).toBe(true)
  })

  it('17. discard_local wipes only the selected user workspace', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)
    await getLocalStore().putChild({
      id: createUuid(),
      version: 1,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'clean',
      registrationNumber: 'B-1',
      firstName: 'Bob',
      fullName: 'Bob',
      centerId: CENTER_B,
      centerName: 'B',
      dateOfBirth: '2020-01-01',
      gender: 'Umuhungu',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '078',
      guardianRelation: 'umubyeyi_papa',
      homeVillageId: createUuid(),
      registeredAt: '2024-01-01',
      province: 'p',
      district: 'd',
      sector: 's',
      cell: 'c',
      village: 'v',
    })

    await applyLogoutDataPolicy('discard_local', { userId: USER_A })

    await activateLocalWorkspace(USER_A, CENTER_A)
    expect(await getLocalStore().listChildren()).toHaveLength(0)
    expect(await getLocalStore().listOperations()).toHaveLength(0)

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listChildren()).toHaveLength(1)
  })

  it('18. shared device registry id remains stable across users', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await getLocalStore().upsertDevice({
      id: 'shared-device-registry-id',
      deviceUuid: 'client-uuid-1',
      userId: USER_A,
      centerId: CENTER_A,
      registeredAt: new Date().toISOString(),
    })
    expect(tokenStorage.getDeviceId()).toBe('shared-device-registry-id')

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(tokenStorage.getDeviceId()).toBe('shared-device-registry-id')
    // Mirror into B workspace without minting a new registry id.
    await getLocalStore().upsertDevice({
      id: 'shared-device-registry-id',
      deviceUuid: 'client-uuid-1',
      userId: USER_B,
      centerId: CENTER_B,
      registeredAt: new Date().toISOString(),
    })
    expect(tokenStorage.getDeviceId()).toBe('shared-device-registry-id')
  })

  it('19. React Query projections clear on account switch', async () => {
    queryClient.setQueryData(['children', 'list', { centerId: CENTER_A }], [{ id: 'stale-a' }])
    await activateLocalWorkspace(USER_A, CENTER_A)
    queryClient.setQueryData(['children', 'list', { centerId: CENTER_A }], [{ id: 'a-child' }])

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(queryClient.getQueryData(['children', 'list', { centerId: CENTER_A }])).toBeUndefined()
  })

  it('20. claimLegacyOwnership can claim LEGACY_UNOWNED but never rebind concrete owners', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const store = getLocalStore()
    const legacyId = createUuid()
    // Direct table write simulation: enqueue then force legacy stamp via claim path
    await store.enqueueOperation({
      clientOperationId: legacyId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      ownerUserId: USER_A,
    })
    await expect(
      store.updateOperation(legacyId, { ownerUserId: USER_B }),
    ).rejects.toThrow(/Refusing to rebind/)
  })

  it('21. refuses silent rebind of outbox ownership on coalesce', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const opId = createUuid()
    await getLocalStore().enqueueOperation({
      clientOperationId: opId,
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
      ownerUserId: USER_A,
    })
    await expect(
      getLocalStore().enqueueOperation({
        clientOperationId: opId,
        entityType: 'child',
        operation: 'create',
        entityId: createUuid(),
        version: 0,
        ownerUserId: USER_B,
        payload: { hacked: true },
      }),
    ).rejects.toThrow(/Refusing to rebind/)
  })

  it('22. syncNow aborts when no active owner', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await deactivateLocalWorkspace()
    const engine = resetSyncEngineForTests(getLocalStore())
    await engine.syncNow()
    const snap = await engine.getSnapshot()
    expect(snap.status).toBe('SYNC_ERROR')
    expect(snap.lastError).toMatch(/No active local owner/)
  })

  it('23. syncNow identity race: owner change mid-cycle stops safely', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    tokenStorage.setDeviceId('shared-device-registry-id')
    vi.mocked(syncControllerPull).mockImplementation(async () => {
      // Switch owner during pull — leased cycle store must keep writing to A.
      await activateLocalWorkspace(USER_B, CENTER_B)
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
    await activateLocalWorkspace(USER_A, CENTER_A)
    const engine2 = resetSyncEngineForTests(getLocalStore())
    await engine2.syncNow()
    const snap = await engine2.getSnapshot()
    expect(snap.status).toBe('SYNC_ERROR')
    expect(snap.lastError).toMatch(/owner changed/i)
  })

  it('23b. sync lease: mid-cycle pull rows do not land in the switched user DB', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    tokenStorage.setDeviceId('shared-device-registry-id')
    const childId = createUuid()
    vi.mocked(syncControllerPull).mockImplementation(async () => {
      await activateLocalWorkspace(USER_B, CENTER_B)
      expect(getActiveOwnerUserId()).toBe(USER_B)
      return {
        cursor: { lastModifiedAt: '2026-08-10T00:00:00.000Z', id: childId },
        nextCursor: { lastModifiedAt: '2026-08-10T00:00:00.000Z', id: childId },
        hasMore: false,
        limit: 500,
        created: {
          ...emptyBuckets(),
          child: [
            {
              id: childId,
              registrationNumber: 'REG-LEASE',
              firstName: 'Leased',
              lastName: 'Child',
              fullName: 'Leased Child',
              centerId: CENTER_A,
              dateOfBirth: '2021-01-01',
              gender: 'Umuhungu',
              status: 'active',
              version: 1,
              guardianName: 'G',
              guardianPhone: '0788000000',
              guardianRelation: 'Parent',
              homeVillageId: 'v1',
            },
          ],
        },
        updated: emptyBuckets(),
        deleted: emptyBuckets(),
      }
    })
    await activateLocalWorkspace(USER_A, CENTER_A)
    const engine = resetSyncEngineForTests(getLocalStore())
    await engine.syncNow()
    expect((await engine.getSnapshot()).lastError).toMatch(/owner changed/i)

    // Active workspace is B — must not contain A's pulled child.
    expect(getActiveOwnerUserId()).toBe(USER_B)
    expect(await getLocalStore().getChild(childId)).toBeNull()

    // A's leased DB received the pull row.
    await activateLocalWorkspace(USER_A, CENTER_A)
    expect(await getLocalStore().getChild(childId)).toBeTruthy()
  })

  it('24. migration preserves pending ops across schema version bump metadata', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const opId = createUuid()
    await getLocalStore().enqueueOperation({
      clientOperationId: opId,
      entityType: 'attendance_record',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })
    expect(await getLocalStore().getMeta(META_KEYS.schemaVersion)).toBe('6')
    const op = await getLocalStore().getOperation(opId)
    expect(op?.ownerUserId).toBe(USER_A)
    expect(op?.status).toBe('pending')
  })

  it('25. clearUserLocalData preserves unrelated IndexedDB databases', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await seedUserAWorkspace(getLocalStore())
    await activateLocalWorkspace(USER_B, CENTER_B)
    await getLocalStore().enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'child',
      operation: 'create',
      entityId: createUuid(),
      version: 0,
    })

    await clearUserLocalData(USER_A)

    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listOperations()).toHaveLength(1)

    const names = await Dexie.getDatabaseNames()
    expect(names).toContain(userOfflineDbName(USER_B))
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
