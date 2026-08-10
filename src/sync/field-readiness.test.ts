/**
 * Sprint 4.8.8 — Caretaker field-readiness simulation.
 *
 * Proves the offline day: seed → offline work → restarts → auth expiry →
 * isolation → sync failure matrix → large queue → dependency stress → conflicts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  activateLocalWorkspace,
  deactivateLocalWorkspace,
  deleteUserLocalDatabase,
  getLocalStore,
  META_KEYS,
  LocalWriteError,
  toLocalWriteError,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { resetSyncEngineForTests, getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import { MAX_PUSH_BATCH, UNSYNCED_OUTBOX_STATUSES } from '@/sync/sync-types'
import { selectPushBatch } from '@/sync/outbox'
import { clearTestOwner } from '@/storage/test-owner'
import {
  createChildLocalFirst,
  updateChildLocalFirst,
  ChildUpdateRequiresOnlineError,
} from '@/features/children/local-children'
import {
  upsertAttendanceLocalFirst,
  softDeleteAttendanceLocalFirst,
} from '@/features/attendance/local-attendance'
import { createScreeningLocalFirst } from '@/features/nutrition/local-screenings'
import {
  upsertFeedingDayLocalFirst,
  upsertFeedingMonthSummaryLocalFirst,
} from '@/features/feeding/local-feeding'
import { createStedLocalFirst } from '@/features/sted/local-sted'
import {
  createReferralLocalFirst,
  updateReferralStatusLocalFirst,
  patchReferralLocalFirst,
} from '@/features/referrals/local-referrals'
import { emptyPhysicalCheck } from '@/lib/sted-utils'
import {
  applyLogoutDataPolicy,
  evaluateLogoutPolicy,
} from '@/offline/logout-policy'
import { common } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { buildChildUpdateSyncPayload } from '@/sync/child-sync-mapper'
import { acknowledgeConflictOperations } from '@/sync/acknowledge-conflicts'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

import {
  syncControllerPush,
  syncControllerPull,
} from '@/api/generated/endpoints/sync/sync'

const USER_A = 'field-user-a'
const USER_B = 'field-user-b'
const CENTER_A = 'field-center-a'
const CENTER_B = 'field-center-b'
const CHILD_COUNT = 25

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

function setOnline(online: boolean) {
  Object.defineProperty(networkState, 'getSnapshot', {
    configurable: true,
    value: () =>
      online
        ? { status: 'ONLINE' as const, isOnline: true, lastReachableAt: null }
        : { status: 'OFFLINE' as const, isOnline: false, lastReachableAt: null },
  })
}

function childForm(name: string) {
  return {
    fullName: name,
    dateOfBirth: '2021-03-15',
    gender: 'Umukobwa',
    specialNeeds: '',
    guardianName: 'Guardian',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi',
    guardian2Name: '',
    guardian2Phone: '',
    guardian2Relation: '',
    province: 'p',
    district: 'd',
    sector: 's',
    cell: 'c',
    village: 'v',
  } as never
}

async function seedSyncedSnapshot(userId: string, centerId: string, childCount: number) {
  await activateLocalWorkspace(userId, centerId)
  const store = getLocalStore()
  const now = new Date().toISOString()
  const children = []
  for (let i = 0; i < childCount; i += 1) {
    const id = createUuid()
    children.push({
      id,
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean' as const,
      registrationNumber: `REG-${i}`,
      firstName: `Child${i}`,
      fullName: `Child${i} Test`,
      centerId,
      centerName: 'Field Center',
      dateOfBirth: '2021-01-01',
      gender: 'Umukobwa',
      status: 'active' as const,
      guardianName: 'G',
      guardianPhone: '0781111111',
      guardianRelation: 'umubyeyi',
      homeVillageId: 'village-1',
      registeredAt: '2024-01-01',
      province: 'p',
      district: 'd',
      sector: 's',
      cell: 'c',
      village: 'v',
    })
  }
  await store.putChildren(children)

  // Seed a few historical domain rows (clean).
  const c0 = children[0]
  await store.putAttendance({
    id: createUuid(),
    childId: c0.id,
    centerId,
    date: '2026-08-01',
    present: true,
    absentReason: null,
    notes: null,
    recordedBy: userId,
    broughtBy: null,
    broughtByOther: null,
    arrivedAt: now,
    version: 1,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  })
  await store.putNutritionScreening({
    id: createUuid(),
    childId: c0.id,
    centerId,
    screeningDate: '2026-07-01',
    weightKg: 12,
    heightCm: 85,
    muacCm: 14,
    headCircumferenceCm: null,
    nutritionStatus: 'normal',
    requiresReferral: false,
    feedingConcern: false,
    recordedById: userId,
    version: 1,
    deletedAt: null,
    lastModifiedAt: now,
    createdAt: now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  })
  await store.putFeedingDay({
    id: createUuid(),
    centerId,
    date: '2026-08-01',
    milkServed: true,
    porridgeServed: true,
    balancedMealServed: false,
    cerealsOrTubers: false,
    legumes: false,
    dairy: false,
    animalProducts: false,
    fruitsVegetables: false,
    addedFat: false,
    recordedById: userId,
    version: 1,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  })
  await store.setMeta(META_KEYS.hasLocalSnapshot, 'true')
  await store.setMeta(META_KEYS.lastSyncedAt, now)
  await store.setPullCursor({ lastModifiedAt: now, id: c0.id })
  return { store, children }
}

describe('Sprint 4.8.8 caretaker field readiness', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' })
    tokenStorage.setDeviceId('field-device')
    clearTestOwner()
    localStorage.removeItem('ecd_legacy_db_migrated_to')
    await deleteUserLocalDatabase(USER_A).catch(() => undefined)
    await deleteUserLocalDatabase(USER_B).catch(() => undefined)
    setOnline(true)
  })

  afterEach(async () => {
    clearTestOwner()
    await deactivateLocalWorkspace().catch(() => undefined)
    await deleteUserLocalDatabase(USER_A).catch(() => undefined)
    await deleteUserLocalDatabase(USER_B).catch(() => undefined)
  })

  it('Phases 1–3: offline caretaker day + multi-restart durability', async () => {
    const { store, children } = await seedSyncedSnapshot(USER_A, CENTER_A, CHILD_COUNT)
    expect(await store.listChildren()).toHaveLength(CHILD_COUNT)
    expect(await store.getMeta(META_KEYS.hasLocalSnapshot)).toBe('true')

    setOnline(false)
    const engine = resetSyncEngineForTests(store)
    await engine.syncNow()
    expect(syncControllerPush).not.toHaveBeenCalled()

    // Child register
    const created = await createChildLocalFirst(store, {
      form: childForm('New Offline Child'),
      centerId: CENTER_A,
      centerName: 'Field Center',
      homeVillageId: 'village-1',
      villageResolved: true,
    })
    expect(created.id).toBeTruthy()
    expect((await store.getChild(created.id))?._localStatus).toBe('dirty')

    // Attendance for multiple children + update + soft-delete
    const a1 = await upsertAttendanceLocalFirst(store, {
      childId: children[1].id,
      date: '2026-08-10',
      present: true,
      centerId: CENTER_A,
      recordedBy: USER_A,
    })
    expect(a1.savedOnDevice).toBe(true)
    await upsertAttendanceLocalFirst(store, {
      childId: children[2].id,
      date: '2026-08-10',
      present: false,
      absentReason: 'sick',
      centerId: CENTER_A,
      recordedBy: USER_A,
    })
    await upsertAttendanceLocalFirst(store, {
      childId: children[1].id,
      date: '2026-08-10',
      present: true,
      notes: 'late',
      centerId: CENTER_A,
      recordedBy: USER_A,
    })
    await softDeleteAttendanceLocalFirst(store, children[2].id, '2026-08-10')

    // Nutrition: normal + referral-triggering severe MUAC
    const screeningNormal = await createScreeningLocalFirst(store, {
      childId: children[3].id,
      centerId: CENTER_A,
      date: '2026-08-10',
      weightKg: 13,
      heightCm: 90,
      muacCm: 14.5,
      recordedById: USER_A,
    })
    expect(screeningNormal.savedOnDevice).toBe(true)
    expect(screeningNormal.referral).toBeUndefined()

    const screeningSevere = await createScreeningLocalFirst(store, {
      childId: children[4].id,
      centerId: CENTER_A,
      date: '2026-08-10',
      weightKg: 8,
      heightCm: 70,
      muacCm: 10.5,
      recordedById: USER_A,
    })
    expect(screeningSevere.referral).toBeTruthy()
    expect(screeningSevere.referralOperationId).toBeTruthy()

    // Correction / second screening same child (append-only)
    const correction = await createScreeningLocalFirst(store, {
      childId: children[3].id,
      centerId: CENTER_A,
      date: '2026-08-11',
      weightKg: 13.2,
      heightCm: 90,
      muacCm: 14.6,
      recordedById: USER_A,
      notes: 'correction',
    })
    expect(correction.screening.id).not.toBe(screeningNormal.screening.id)

    // Feeding
    await upsertFeedingDayLocalFirst(store, {
      centerId: CENTER_A,
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: true,
      balancedMealServed: false,
      recordedById: USER_A,
    })
    await upsertFeedingDayLocalFirst(store, {
      centerId: CENTER_A,
      date: '2026-08-11',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      recordedById: USER_A,
    })
    await upsertFeedingMonthSummaryLocalFirst(store, {
      centerId: CENTER_A,
      yearMonth: '2026-08',
      milkLiters: 40,
      flourKg: 25,
      foodSource: 'Center stock',
      updatedById: USER_A,
    })

    // STED + referred STED
    const physicalOk = emptyPhysicalCheck()
    await createStedLocalFirst(store, {
      childId: children[5].id,
      centerId: CENTER_A,
      assessmentDate: '2026-08-10',
      ageBand: '1_3',
      consentObtained: true,
      noProblem: true,
      physical: physicalOk,
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
        followUpIn6Months: true,
      },
      assessedById: USER_A,
    })

    const stedReferred = await createStedLocalFirst(store, {
      childId: children[6].id,
      centerId: CENTER_A,
      assessmentDate: '2026-08-10',
      ageBand: '1_3',
      consentObtained: true,
      noProblem: false,
      physical: { ...physicalOk, headFace: 'problem' },
      milestones: {
        pickStandStep: 'oya',
        chooseStack: 'oya',
        imitatePicture: 'oya',
        scribble: 'oya',
        knowsTools: 'oya',
        understandsCommands: 'oya',
        socialPlay: 'oya',
      },
      outcome: {
        normal: false,
        referred: true,
        counseling: true,
        other: false,
        followUpIn6Months: true,
      },
      assessedById: USER_A,
      referralReason: 'STED referral',
      referralDestination: 'Ikigo nderabuzima',
    })
    expect(stedReferred.referral).toBeTruthy()

    // Standalone referral + status/notes
    const standalone = await createReferralLocalFirst(store, {
      childId: children[7].id,
      centerId: CENTER_A,
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'Standalone',
      destination: 'Hospital',
      recordedById: USER_A,
    })
    await patchReferralLocalFirst(store, standalone.referral.id, {
      notes: 'Follow up notes',
    })
    await updateReferralStatusLocalFirst(store, {
      id: standalone.referral.id,
      status: 'completed',
    })

    // Guardian-only child update stays offline-local
    const guardianUpdate = await updateChildLocalFirst(store, children[0].id, {
      guardianPhone: '0789999999',
    })
    expect(guardianUpdate.savedOnDevice).toBe(true)

    // Update sync payload must never smuggle DOB / gender / homeVillageId
    const updatedChild = await store.getChild(children[0].id)
    expect(updatedChild).toBeTruthy()
    const updatePayload = buildChildUpdateSyncPayload(updatedChild!)
    expect(updatePayload).not.toHaveProperty('dateOfBirth')
    expect(updatePayload).not.toHaveProperty('gender')
    expect(updatePayload).not.toHaveProperty('homeVillageId')
    const pendingChildUpdate = (await store.listOperations({ status: 'pending' })).find(
      (o) => o.entityId === children[0].id && o.operation === 'update',
    )
    expect(pendingChildUpdate?.payload).toBeTruthy()
    expect(pendingChildUpdate!.payload).not.toHaveProperty('dateOfBirth')
    expect(pendingChildUpdate!.payload).not.toHaveProperty('gender')
    expect(pendingChildUpdate!.payload).not.toHaveProperty('homeVillageId')

    // DOB change offline must refuse (sync CAS limitation)
    await expect(
      updateChildLocalFirst(store, children[0].id, { dateOfBirth: '2020-01-01' }),
    ).rejects.toBeInstanceOf(ChildUpdateRequiresOnlineError)

    const pendingBeforeRestart = await store.countOperations(UNSYNCED_OUTBOX_STATUSES)
    expect(pendingBeforeRestart).toBeGreaterThan(10)
    const opIdsBefore = new Set(
      (await store.listOperations({ status: UNSYNCED_OUTBOX_STATUSES })).map(
        (o) => o.clientOperationId,
      ),
    )
    const cursorBefore = await store.getPullCursor()

    // Phase 3 — simulate 1 / 3 / 5 restarts via deactivate + reactivate
    for (let i = 0; i < 5; i += 1) {
      await deactivateLocalWorkspace()
      await activateLocalWorkspace(USER_A, CENTER_A)
      const restarted = getLocalStore()
      expect(await restarted.listChildren()).toHaveLength(CHILD_COUNT + 1)
      expect(await restarted.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(
        pendingBeforeRestart,
      )
      const opIds = new Set(
        (await restarted.listOperations({ status: UNSYNCED_OUTBOX_STATUSES })).map(
          (o) => o.clientOperationId,
        ),
      )
      expect(opIds).toEqual(opIdsBefore)
      expect(await restarted.getPullCursor()).toEqual(cursorBefore)
      expect(await restarted.getMeta(META_KEYS.hasLocalSnapshot)).toBe('true')
    }
  })

  it('Phase 4: AUTH_REQUIRED offline preserves outbox; work continues', async () => {
    const { store } = await seedSyncedSnapshot(USER_A, CENTER_A, 5)
    setOnline(false)
    await createChildLocalFirst(store, {
      form: childForm('Auth Offline'),
      centerId: CENTER_A,
      centerName: 'Field Center',
      homeVillageId: 'village-1',
      villageResolved: true,
    })
    const pending = await store.countOperations(UNSYNCED_OUTBOX_STATUSES)
    const engine = resetSyncEngineForTests(store)
    engine.setAuthRequired(true)
    expect((await engine.getSnapshot()).status).toBe('AUTH_REQUIRED')

    await createChildLocalFirst(store, {
      form: childForm('Still Works'),
      centerId: CENTER_A,
      centerName: 'Field Center',
      homeVillageId: 'village-1',
      villageResolved: true,
    })
    expect(await store.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(pending + 1)
    expect(await store.listChildren()).toHaveLength(7)
  })

  it('Phase 5: account isolation keep/discard', async () => {
    const { store: storeA } = await seedSyncedSnapshot(USER_A, CENTER_A, 8)
    setOnline(false)
    const createdA = await createChildLocalFirst(storeA, {
      form: childForm('Only A'),
      centerId: CENTER_A,
      centerName: 'A',
      homeVillageId: 'v',
      villageResolved: true,
    })
    const pendingA = await storeA.countOperations(UNSYNCED_OUTBOX_STATUSES)
    expect(pendingA).toBeGreaterThan(0)

    await applyLogoutDataPolicy('keep_on_device')
    await activateLocalWorkspace(USER_B, CENTER_B)
    const storeB = getLocalStore()
    expect(await storeB.listChildren()).toHaveLength(0)
    expect(await storeB.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(0)
    expect(await storeB.getChild(createdA.id)).toBeNull()

    await applyLogoutDataPolicy('keep_on_device')
    await activateLocalWorkspace(USER_A, CENTER_A)
    const restored = getLocalStore()
    expect(await restored.getChild(createdA.id)).toBeTruthy()
    expect(await restored.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(pendingA)

    // Discard A, then B stays isolated empty
    await applyLogoutDataPolicy('discard_local', { userId: USER_A })
    await activateLocalWorkspace(USER_B, CENTER_B)
    expect(await getLocalStore().listChildren()).toHaveLength(0)

    await activateLocalWorkspace(USER_A, CENTER_A)
    expect(await getLocalStore().getChild(createdA.id)).toBeNull()
    expect(await getLocalStore().countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(0)
  })

  it('Phase 6: sync failure matrix retains operations', async () => {
    const { store } = await seedSyncedSnapshot(USER_A, CENTER_A, 3)
    const created = await createChildLocalFirst(store, {
      form: childForm('Fail Matrix'),
      centerId: CENTER_A,
      centerName: 'C',
      homeVillageId: 'v',
      villageResolved: true,
    })
    const op = (await store.listOperations({ status: 'pending' })).find(
      (o) => o.entityId === created.id,
    )!
    const opId = op.clientOperationId
    tokenStorage.setDeviceId('field-device')
    setOnline(true)

    // Failure A — network during push
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockRejectedValueOnce(new Error('network'))
    await resetSyncEngineForTests(store).syncNow()
    expect((await store.getOperation(opId))?.clientOperationId).toBe(opId)
    expect(['pending', 'failed', 'syncing']).toContain(
      (await store.getOperation(opId))?.status,
    )

    // Failure C — API 500
    vi.mocked(syncControllerPush).mockRejectedValueOnce(
      Object.assign(new Error('server'), { response: { status: 500 } }),
    )
    await getSyncEngine().syncNow()
    expect((await store.getOperation(opId))?.status).not.toBe('applied')

    // Failure D — AUTH_REQUIRED path preserves outbox
    const engineAuth = resetSyncEngineForTests(store)
    engineAuth.setAuthRequired(true)
    expect((await engineAuth.getSnapshot()).status).toBe('AUTH_REQUIRED')
    expect((await store.getOperation(opId))?.status).not.toBe('applied')
    expect(await store.getChild(created.id)).toBeTruthy()

    // Failure F — single-flight
    engineAuth.setAuthRequired(false)
    let pushCalls = 0
    vi.mocked(syncControllerPush).mockImplementation(async () => {
      pushCalls += 1
      await new Promise((r) => setTimeout(r, 30))
      return {
        sessionId: null,
        accepted: 0,
        created: 0,
        deduplicated: 0,
        status: 'applied',
        operations: [],
      }
    })
    const engine = resetSyncEngineForTests(store)
    const p1 = engine.syncNow()
    const p2 = engine.syncNow()
    await Promise.all([p1, p2])
    expect(pushCalls).toBeLessThanOrEqual(1)
  })

  it('Phase 7: large queue respects batch ≤500 and unique op ids', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const store = getLocalStore()
    const sizes = [100, 500, 1000]
    for (const size of sizes) {
      // Clear prior pending by wiping ops table via discard+reactivate would be heavy;
      // enqueue uniquely and assert selectPushBatch.
      for (let i = 0; i < size; i += 1) {
        await store.enqueueOperation({
          clientOperationId: createUuid(),
          entityType: 'child',
          operation: 'create',
          entityId: createUuid(),
          version: 0,
          payload: { i },
        })
      }
      const batch = await selectPushBatch(store, MAX_PUSH_BATCH)
      expect(batch.length).toBeLessThanOrEqual(500)
      const ids = batch.map((o) => o.clientOperationId)
      expect(new Set(ids).size).toBe(ids.length)
      expect(await store.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBeGreaterThanOrEqual(size)
      // Discard between sizes to keep DB manageable
      await applyLogoutDataPolicy('discard_local', { userId: USER_A })
      await activateLocalWorkspace(USER_A, CENTER_A)
    }
  })

  it('Phase 8: screening/STED → referral dependency ordering + blocked restart', async () => {
    const { store, children } = await seedSyncedSnapshot(USER_A, CENTER_A, 12)
    setOnline(false)

    const screeningOps: string[] = []
    const referralOps: string[] = []
    for (let i = 0; i < 10; i += 1) {
      const result = await createScreeningLocalFirst(store, {
        childId: children[i].id,
        centerId: CENTER_A,
        date: `2026-08-${String(10 + (i % 10)).padStart(2, '0')}`,
        weightKg: 8,
        heightCm: 70,
        muacCm: 10.2,
        recordedById: USER_A,
      })
      expect(result.referralOperationId).toBeTruthy()
      screeningOps.push(result.screeningOperationId)
      referralOps.push(result.referralOperationId!)
    }

    for (const refOpId of referralOps) {
      const refOp = await store.getOperation(refOpId)
      expect(refOp?.status).toBe('blocked')
      expect(refOp?.dependsOn?.length).toBeGreaterThan(0)
    }

    // Restart while blocked
    await deactivateLocalWorkspace()
    await activateLocalWorkspace(USER_A, CENTER_A)
    const restarted = getLocalStore()
    for (const refOpId of referralOps) {
      expect((await restarted.getOperation(refOpId))?.status).toBe('blocked')
    }

    // Simulate parent applied → referral unblocked by marking screening ops applied
    // and refreshing via outbox helper used by SyncEngine.
    const { refreshBlockedOperations } = await import('@/sync/outbox')
    for (const screeningOpId of screeningOps) {
      await restarted.updateOperation(screeningOpId, { status: 'applied' })
    }
    await refreshBlockedOperations(restarted)
    for (const refOpId of referralOps) {
      expect((await restarted.getOperation(refOpId))?.status).toBe('pending')
    }
  })

  it('Phase 9: CAS conflict retained (server-wins); append-only creates do not false-conflict', async () => {
    const { store, children } = await seedSyncedSnapshot(USER_A, CENTER_A, 4)
    const childId = children[0].id
    await updateChildLocalFirst(store, childId, { guardianName: 'Stale Device A' })
    const op = (await store.listOperations({ status: 'pending' })).find(
      (o) => o.entityId === childId && o.operation === 'update',
    )!
    expect(op.version).toBe(1)

    // Concurrent nutrition creates for same child — both pending creates, not CAS conflicts
    const s1 = await createScreeningLocalFirst(store, {
      childId,
      centerId: CENTER_A,
      date: '2026-08-12',
      weightKg: 12,
      heightCm: 80,
      muacCm: 14,
      recordedById: USER_A,
    })
    const s2 = await createScreeningLocalFirst(store, {
      childId,
      centerId: CENTER_A,
      date: '2026-08-13',
      weightKg: 12.1,
      heightCm: 80,
      muacCm: 14.1,
      recordedById: USER_A,
    })
    expect(s1.screeningOperationId).not.toBe(s2.screeningOperationId)
    expect((await store.getOperation(s1.screeningOperationId))?.status).toBe('pending')
    expect((await store.getOperation(s2.screeningOperationId))?.status).toBe('pending')

    // Mark child update as conflict (simulating server CAS rejection)
    await store.updateOperation(op.clientOperationId, {
      status: 'conflict',
      lastError: 'CAS version mismatch',
    })
    expect((await store.getOperation(op.clientOperationId))?.status).toBe('conflict')
    expect(await evaluateLogoutPolicy('cancel')).toMatchObject({ allowed: false })

    const conflictChild = await store.getChild(childId)
    expect(conflictChild?.fullName).toBeTruthy()
    expect(common.sync.conflictServerWins).toBeTruthy()
    expect(common.sync.conflictItem).toContain('{label}')

    // Acknowledge after server-wins clears conflict without wiping workspace
    const cleared = await acknowledgeConflictOperations(store, { ownerUserId: USER_A })
    expect(cleared).toBeGreaterThanOrEqual(1)
    expect((await store.getOperation(op.clientOperationId))?.status).toBe('applied')
    expect(await store.getChild(childId)).toBeTruthy()
  })

  it('Phase 11: no-snapshot offline empty messaging (no mock)', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    const store = getLocalStore()
    expect(await store.getMeta(META_KEYS.hasLocalSnapshot)).not.toBe('true')
    expect(await store.listChildren()).toHaveLength(0)
    expect(common.sync.noLocalSnapshotBody).toMatch(/internet/i)
  })

  it('Phase 13: storage write failure never claims saved; no phantom outbox', async () => {
    const { store } = await seedSyncedSnapshot(USER_A, CENTER_A, 2)
    const beforeOps = await store.countOperations(UNSYNCED_OUTBOX_STATUSES)
    const beforeChildren = (await store.listChildren()).length

    const runSpy = vi.spyOn(store, 'runTransaction').mockRejectedValueOnce(
      Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' }),
    )

    await expect(
      createChildLocalFirst(store, {
        form: childForm('Quota Fail'),
        centerId: CENTER_A,
        centerName: 'C',
        homeVillageId: 'v',
        villageResolved: true,
      }),
    ).rejects.toBeTruthy()

    runSpy.mockRestore()

    // Re-run through LocalWriteError path as production pages do
    const quota = toLocalWriteError(
      Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' }),
    )
    expect(quota).toBeInstanceOf(LocalWriteError)
    expect(quota.code).toBe('QUOTA_EXCEEDED')
    const msg = messageForMutationFailure(quota)
    expect(msg).toBe(common.sync.storageFull)
    expect(msg).toMatch(/ntabwo byabitswe/i)
    expect(msg).not.toBe(common.sync.savedOnDevice)

    expect(await store.countOperations(UNSYNCED_OUTBOX_STATUSES)).toBe(beforeOps)
    expect(await store.listChildren()).toHaveLength(beforeChildren)
  })

  it('Phase 14: discard_local without userId must refuse (no global wipe)', async () => {
    await activateLocalWorkspace(USER_A, CENTER_A)
    await expect(applyLogoutDataPolicy('discard_local', { userId: null })).rejects.toThrow(
      /explicit userId/i,
    )
  })

  it('Phase 15: offline UX strings present for caretaker shell', () => {
    expect(common.sync.savedOnDevice).toBeTruthy()
    expect(common.sync.pending).toContain('{count}')
    expect(common.sync.requiresInternetTitle).toBeTruthy()
    expect(common.sync.childEditNeedsOnline).toBeTruthy()
    expect(common.sync.childEditOfflineTitle).toBeTruthy()
    expect(common.sync.conflictServerWins).toBeTruthy()
    expect(common.sync.conflictAcknowledge).toBeTruthy()
    expect(common.sync.diagnosticQueue).toContain('{pending}')
    expect(common.sync.failedCount).toContain('{count}')
    expect(common.sync.blockedCount).toContain('{count}')
  })
})
