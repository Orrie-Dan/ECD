import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  datesReadyForAutoAbsent,
  isDatePastAttendanceCutoff,
  parseCutoffTime,
} from '@/lib/attendance-cutoff'
import {
  AUTO_ABSENT_REASON,
  findUnrecordedChildIds,
  resetMockAutoAbsentStateForTests,
  runAttendanceAutoAbsentIfDue,
  runMockAttendanceAutoAbsentIfDue,
} from '@/features/attendance/auto-absent'
import {
  resetLocalStoreForTests,
  resetOfflineDbForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import type { AttendanceRecord, Child } from '@/types'

describe('attendance cutoff helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses HH:mm cutoff values', () => {
    expect(parseCutoffTime('16:00')).toEqual({ hours: 16, minutes: 0 })
    expect(parseCutoffTime('bad')).toBeNull()
  })

  it('treats past calendar days as past cutoff', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T10:00:00'))
    expect(isDatePastAttendanceCutoff('2026-08-25')).toBe(true)
  })

  it('waits until cutoff on the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T15:59:00'))
    expect(isDatePastAttendanceCutoff('2026-08-26', new Date(), '16:00')).toBe(false)

    vi.setSystemTime(new Date('2026-08-26T16:00:00'))
    expect(isDatePastAttendanceCutoff('2026-08-26', new Date(), '16:00')).toBe(true)
  })

  it('lists ready dates within lookback', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T17:00:00'))
    expect(datesReadyForAutoAbsent(new Date(), '16:00', 1)).toEqual([
      '2026-08-25',
      '2026-08-26',
    ])
  })
})

describe('auto-absent policy', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-auto-absent-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    resetMockAutoAbsentStateForTests()
  })

  afterEach(() => {
    clearTestOwner()
    resetMockAutoAbsentStateForTests()
    vi.useRealTimers()
  })

  it('finds only children without a record for the day', () => {
    const attendance: AttendanceRecord[] = [
      {
        id: '1',
        childId: 'a',
        date: '2026-08-26',
        present: true,
        recordedBy: 'u',
      },
      {
        id: '2',
        childId: 'b',
        date: '2026-08-26',
        present: false,
        absentReason: 'sick',
        recordedBy: 'u',
      },
    ]

    expect(findUnrecordedChildIds(['a', 'b', 'c'], attendance, '2026-08-26')).toEqual(['c'])
  })

  it('marks unrecorded children absent after cutoff in LIVE local store', async () => {
    const centerId = createUuid()
    const childId = createUuid()
    const userId = createUuid()
    const now = new Date('2026-08-26T16:05:00')

    await store.putChild({
      id: childId,
      version: 1,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'clean',
      registrationNumber: 'ECD-001',
      firstName: 'Aline',
      fullName: 'Aline Uwase',
      centerId,
      centerName: 'Ikigo',
      dateOfBirth: '2020-01-01',
      gender: 'Umukobwa',
      status: 'active',
      guardianName: 'Parent',
      guardianPhone: '0780000000',
      guardianRelation: 'umubyeyi_mama',
      homeVillageId: createUuid(),
      registeredAt: '2026-01-01',
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Remera',
      cell: 'Rukiri',
      village: 'Amahoro',
    })

    const result = await runAttendanceAutoAbsentIfDue(store, {
      centerId,
      recordedByUserId: userId,
      now,
      lookbackDays: 0,
    })

    expect(result.markedCount).toBe(1)
    const rows = await store.listAttendance({ centerId, startDate: '2026-08-26', endDate: '2026-08-26' })
    expect(rows).toHaveLength(1)
    expect(rows[0].present).toBe(false)
    expect(rows[0].absentReason).toBe(AUTO_ABSENT_REASON)
    expect(rows[0].recordedBy).toBe(userId)

    const rerun = await runAttendanceAutoAbsentIfDue(store, {
      centerId,
      recordedByUserId: userId,
      now,
      lookbackDays: 0,
    })
    expect(rerun.markedCount).toBe(0)
  })

  it('does not overwrite children already marked present or absent', async () => {
    const centerId = createUuid()
    const presentChild = createUuid()
    const absentChild = createUuid()
    const userId = createUuid()
    const now = new Date('2026-08-26T16:05:00')

    for (const [id, name] of [
      [presentChild, 'Present'],
      [absentChild, 'Absent'],
    ] as const) {
      await store.putChild({
        id,
        version: 1,
        deletedAt: null,
        lastModifiedAt: new Date().toISOString(),
        _localStatus: 'clean',
        registrationNumber: `ECD-${id.slice(0, 4)}`,
        firstName: name,
        fullName: name,
        centerId,
        centerName: 'Ikigo',
        dateOfBirth: '2020-01-01',
        gender: 'Umukobwa',
        status: 'active',
        guardianName: 'Parent',
        guardianPhone: '0780000000',
        guardianRelation: 'umubyeyi_mama',
        homeVillageId: createUuid(),
        registeredAt: '2026-01-01',
        province: 'Kigali',
        district: 'Gasabo',
        sector: 'Remera',
        cell: 'Rukiri',
        village: 'Amahoro',
      })
    }

    await store.putAttendance({
      id: createUuid(),
      childId: presentChild,
      centerId,
      date: '2026-08-26',
      present: true,
      absentReason: null,
      notes: null,
      recordedBy: userId,
      broughtBy: 'umubyeyi_mama',
      broughtByOther: null,
      arrivedAt: '2026-08-26T08:00:00',
      version: 1,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
    })

    await store.putAttendance({
      id: createUuid(),
      childId: absentChild,
      centerId,
      date: '2026-08-26',
      present: false,
      absentReason: 'sick',
      notes: null,
      recordedBy: userId,
      broughtBy: null,
      broughtByOther: null,
      arrivedAt: null,
      version: 1,
      deletedAt: null,
      lastModifiedAt: new Date().toISOString(),
      _localStatus: 'clean',
      _updatedAtLocal: new Date().toISOString(),
    })

    const result = await runAttendanceAutoAbsentIfDue(store, {
      centerId,
      recordedByUserId: userId,
      now,
      lookbackDays: 0,
    })

    expect(result.markedCount).toBe(0)
    const rows = await store.listAttendance({ centerId, startDate: '2026-08-26', endDate: '2026-08-26' })
    expect(rows).toHaveLength(2)
  })

  it('marks unrecorded children absent in MOCK mode', async () => {
    const now = new Date('2026-08-26T16:05:00')
    const centerId = 'center-1'
    const child: Child = {
      id: 'child-1',
      fullName: 'Test Child',
      dateOfBirth: '2020-01-01',
      gender: 'Umukobwa',
      guardianName: 'Parent',
      guardianPhone: '0780000000',
      guardianRelation: 'umubyeyi_mama',
      homeVillageId: 'village-1',
      registeredAt: '2026-01-01',
      status: 'active',
      registrationNumber: 'ECD-001',
      centerId,
      centerName: 'Ikigo',
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Remera',
      cell: 'Rukiri',
      village: 'Amahoro',
    }

    const records: AttendanceRecord[] = []
    const recordAttendance = vi.fn(async (record: Omit<AttendanceRecord, 'id'>) => {
      records.push({ ...record, id: String(records.length + 1) })
    })

    const result = await runMockAttendanceAutoAbsentIfDue({
      centerId,
      recordedBy: 'Umurezi',
      children: [child],
      attendance: records,
      recordAttendance,
      now,
      lookbackDays: 0,
    })

    expect(result.markedCount).toBe(1)
    expect(recordAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        date: '2026-08-26',
        present: false,
        absentReason: AUTO_ABSENT_REASON,
      }),
    )
  })
})
