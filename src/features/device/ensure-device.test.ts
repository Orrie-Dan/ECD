import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { tokenStorage } from '@/api/token-storage'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import {
  clearBrowserDeviceIdentity,
  ensureDeviceRegistered,
  ensureDeviceRegisteredUntilOk,
} from '@/features/device/ensure-device'

vi.mock('@/config/env', () => ({
  env: {
    apiMode: 'live',
    isMock: false,
    isLive: true,
    apiBaseUrl: 'http://localhost:3000',
  },
}))

vi.mock('@/api/generated/endpoints/devices/devices', () => ({
  devicesControllerRegister: vi.fn(),
}))

import { devicesControllerRegister } from '@/api/generated/endpoints/devices/devices'

describe('device identity isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clearAll()
    clearBrowserDeviceIdentity()
    vi.mocked(devicesControllerRegister).mockImplementation(async (dto) => ({
      id: `reg-${dto.deviceUuid}`,
      deviceUuid: dto.deviceUuid,
      platform: 'web',
      appVersion: '0.0.0',
      status: 'active',
      lastSeenAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    }))
  })

  afterEach(() => {
    clearTestOwner()
    clearBrowserDeviceIdentity()
  })

  it('user B after logout does not inherit user A device id', async () => {
    const dbA = resetOfflineDbForTests(`ecd-offline-u-a-${createUuid()}`)
    const storeA = resetLocalStoreForTests(dbA)
    await bindTestOwner(storeA, 'user-a')

    const a = await ensureDeviceRegistered({ userId: 'user-a', store: storeA })
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const deviceA = a.deviceId
    expect(tokenStorage.getDeviceId()).toBe(deviceA)

    clearBrowserDeviceIdentity()
    tokenStorage.clearTokens()
    expect(tokenStorage.getDeviceId()).toBeNull()

    const dbB = resetOfflineDbForTests(`ecd-offline-u-b-${createUuid()}`)
    const storeB = resetLocalStoreForTests(dbB)
    await bindTestOwner(storeB, 'user-b')

    const b = await ensureDeviceRegistered({ userId: 'user-b', store: storeB })
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(b.deviceId).not.toBe(deviceA)
    expect(b.deviceUuid).not.toBe(a.deviceUuid)
    expect(tokenStorage.getDeviceId()).toBe(b.deviceId)
  })

  it('same user restores workspace device after logout', async () => {
    const db = resetOfflineDbForTests(`ecd-offline-u-same-${createUuid()}`)
    const store = resetLocalStoreForTests(db)
    await bindTestOwner(store, 'user-a')

    const first = await ensureDeviceRegistered({ userId: 'user-a', store })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    clearBrowserDeviceIdentity()
    tokenStorage.clearTokens()
    expect(tokenStorage.getDeviceId()).toBeNull()

    const second = await ensureDeviceRegistered({ userId: 'user-a', store })
    expect(tokenStorage.getDeviceId()).toBe(first.deviceId)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.deviceId).toBe(first.deviceId)
    expect(second.deviceUuid).toBe(first.deviceUuid)
    expect(tokenStorage.getDeviceId()).toBe(first.deviceId)
  })

  it('409 from another user mints a new uuid and registers', async () => {
    const db = resetOfflineDbForTests(`ecd-offline-u-409-${createUuid()}`)
    const store = resetLocalStoreForTests(db)
    await bindTestOwner(store, 'user-b')

    vi.mocked(devicesControllerRegister)
      .mockRejectedValueOnce({
        statusCode: 409,
        message: 'This device is already registered to another user',
        messages: ['This device is already registered to another user'],
        isUnauthorized: false,
        isForbidden: false,
        isConflict: true,
        isNetworkError: false,
        isValidationError: false,
        isNotFound: false,
      })
      .mockImplementationOnce(async (dto) => ({
        id: `reg-${dto.deviceUuid}`,
        deviceUuid: dto.deviceUuid,
        platform: 'web',
        appVersion: '0.0.0',
        status: 'active',
        lastSeenAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
      }))

    const result = await ensureDeviceRegistered({ userId: 'user-b', store })
    expect(result.ok).toBe(true)
    expect(devicesControllerRegister).toHaveBeenCalledTimes(2)
    const firstUuid = vi.mocked(devicesControllerRegister).mock.calls[0][0].deviceUuid
    const secondUuid = vi.mocked(devicesControllerRegister).mock.calls[1][0].deviceUuid
    expect(secondUuid).not.toBe(firstUuid)
  })

  it('network + cached device succeeds unless requireServerAck', async () => {
    const db = resetOfflineDbForTests(`ecd-offline-u-net-${createUuid()}`)
    const store = resetLocalStoreForTests(db)
    await bindTestOwner(store, 'user-a')

    const first = await ensureDeviceRegistered({ userId: 'user-a', store })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    vi.mocked(devicesControllerRegister).mockRejectedValue({
      statusCode: 0,
      message: 'Network error',
      messages: ['Network error'],
      isUnauthorized: false,
      isForbidden: false,
      isConflict: false,
      isNetworkError: true,
      isValidationError: false,
      isNotFound: false,
    })

    const cached = await ensureDeviceRegistered({ userId: 'user-a', store })
    expect(cached.ok).toBe(true)
    if (!cached.ok) return
    expect(cached.deviceId).toBe(first.deviceId)

    const gated = await ensureDeviceRegistered({
      userId: 'user-a',
      store,
      requireServerAck: true,
    })
    expect(gated.ok).toBe(false)
    if (gated.ok) return
    expect(gated.reason).toBe('network')
  })

  it('ensureDeviceRegisteredUntilOk retries until the server accepts', async () => {
    const db = resetOfflineDbForTests(`ecd-offline-u-retry-${createUuid()}`)
    const store = resetLocalStoreForTests(db)
    await bindTestOwner(store, 'user-a')

    vi.mocked(devicesControllerRegister)
      .mockRejectedValueOnce({
        statusCode: 0,
        message: 'Network error',
        messages: ['Network error'],
        isUnauthorized: false,
        isForbidden: false,
        isConflict: false,
        isNetworkError: true,
        isValidationError: false,
        isNotFound: false,
      })
      .mockRejectedValueOnce({
        statusCode: 503,
        message: 'Unavailable',
        messages: ['Unavailable'],
        isUnauthorized: false,
        isForbidden: false,
        isConflict: false,
        isNetworkError: false,
        isValidationError: false,
        isNotFound: false,
      })

    const result = await ensureDeviceRegisteredUntilOk({
      userId: 'user-a',
      store,
      requireServerAck: true,
      sleepFn: async () => undefined,
    })
    expect(result.ok).toBe(true)
    expect(devicesControllerRegister).toHaveBeenCalledTimes(3)
  })

  it('ensureDeviceRegisteredUntilOk stops on unauthorized', async () => {
    const db = resetOfflineDbForTests(`ecd-offline-u-401-${createUuid()}`)
    const store = resetLocalStoreForTests(db)
    await bindTestOwner(store, 'user-a')

    vi.mocked(devicesControllerRegister).mockRejectedValue({
      statusCode: 401,
      message: 'Unauthorized',
      messages: ['Unauthorized'],
      isUnauthorized: true,
      isForbidden: false,
      isConflict: false,
      isNetworkError: false,
      isValidationError: false,
      isNotFound: false,
    })

    const result = await ensureDeviceRegisteredUntilOk({
      userId: 'user-a',
      store,
      requireServerAck: true,
      maxAttempts: 5,
      sleepFn: async () => undefined,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unauthorized')
    expect(devicesControllerRegister).toHaveBeenCalledTimes(1)
  })
})
