/**
 * Offline UX: local writes must appear in the React Query projection
 * before reconnect / sync. Default networkMode ('online') pauses refetch.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { onlineManager } from '@tanstack/react-query'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import { attendance, children, localFirstQueryOptions } from '@/api/query-keys'
import { createQueryClient } from '@/api/query-client'
import {
  listAttendanceFromLocal,
  upsertAttendanceLocalFirst,
} from '@/features/attendance/local-attendance'
import { invalidateAttendanceQueries } from '@/features/attendance/mutations'

describe('offline UI projection after local write', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-offline-ui-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    onlineManager.setOnline(false)
  })

  afterEach(() => {
    clearTestOwner()
    onlineManager.setOnline(true)
  })

  it('sets networkMode always on local-first caregiver query keys', () => {
    const client = createQueryClient()
    expect(localFirstQueryOptions.networkMode).toBe('always')
    expect(client.getQueryDefaults(attendance.keys.all).networkMode).toBe('always')
    expect(client.getQueryDefaults(children.keys.all).networkMode).toBe('always')
  })

  it('shows locally saved attendance in the query cache before reconnect', async () => {
    const client = createQueryClient()
    const centerId = createUuid()
    const childId = createUuid()
    const recordedBy = createUuid()
    const date = '2026-08-13'
    const filters = { centerId, startDate: date, endDate: date }
    const queryKey = attendance.keys.window(filters)
    const queryFn = () => listAttendanceFromLocal(store, filters)

    await client.fetchQuery({ queryKey, queryFn })
    expect(client.getQueryData(queryKey)).toEqual([])

    await upsertAttendanceLocalFirst(store, {
      childId,
      date,
      present: true,
      centerId,
      recordedBy,
      broughtBy: 'umubyeyi_mama',
    })

    await invalidateAttendanceQueries(client)
    const next = await client.fetchQuery({ queryKey, queryFn, staleTime: 0 })

    expect(next.some((row) => row.childId === childId && row.present)).toBe(true)
  })
})
