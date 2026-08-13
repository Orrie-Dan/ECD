import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AuthUserResponseDto } from '@/api/generated/models'

vi.mock('@/config/env', () => ({
  env: {
    apiMode: 'live',
    isMock: false,
    isLive: true,
    apiBaseUrl: 'http://localhost:3000',
  },
}))

vi.mock('@/api/resources/auth', () => ({
  loginRequest: vi.fn(),
}))

vi.mock('@/storage', async () => {
  const actual = await vi.importActual<typeof import('@/storage')>('@/storage')
  return {
    ...actual,
    activateLocalWorkspace: vi.fn(),
  }
})

vi.mock('@/features/device', () => ({
  ensureDeviceRegisteredUntilOk: vi.fn(),
  ensureDeviceRegistered: vi.fn(),
  clearBrowserDeviceIdentity: vi.fn(),
}))

import { loginRequest } from '@/api/resources/auth'
import { activateLocalWorkspace } from '@/storage'
import { ensureDeviceRegisteredUntilOk } from '@/features/device'
import { completeLiveLogin } from '@/features/auth/complete-live-login'
import { tokenStorage } from '@/api/token-storage'

const apiUser: AuthUserResponseDto = {
  id: 'user-1',
  username: 'caregiver1',
  role: 'caregiver',
  districtId: null,
  centerId: 'center-1',
  center: { id: 'center-1', code: 'C1', name: 'Ikigo' },
}

describe('completeLiveLogin', () => {
  const setSession = vi.fn()
  const clearSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clearAll()
    vi.mocked(loginRequest).mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: 'user-1',
        name: 'caregiver1',
        role: 'caretaker',
        centerId: 'center-1',
        centerName: 'Ikigo',
      },
      apiUser,
    })
    vi.mocked(activateLocalWorkspace).mockResolvedValue({
      store: {} as never,
      userId: 'user-1',
      migratedLegacy: false,
      dbName: 'ecd-offline-u-user-1',
    })
    vi.mocked(ensureDeviceRegisteredUntilOk).mockResolvedValue({
      ok: true,
      deviceId: 'dev-1',
      deviceUuid: 'uuid-1',
    })
  })

  it('does not finish login until the device is registered', async () => {
    vi.mocked(ensureDeviceRegisteredUntilOk).mockImplementation(async () => {
      expect(tokenStorage.getAccessToken()).toBe('access')
      expect(setSession).not.toHaveBeenCalled()
      return { ok: true, deviceId: 'dev-1', deviceUuid: 'uuid-1' }
    })

    const result = await completeLiveLogin(
      { username: 'caregiver1', password: 'secret', expectedRole: 'caretaker' },
      { setSession, clearSession },
    )

    expect(result.success).toBe(true)
    expect(activateLocalWorkspace).toHaveBeenCalledWith('user-1', 'center-1')
    expect(ensureDeviceRegisteredUntilOk).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        centerId: 'center-1',
        requireServerAck: true,
      }),
    )
    expect(setSession).toHaveBeenCalledTimes(1)
    expect(setSession).toHaveBeenCalledWith(
      { accessToken: 'access', refreshToken: 'refresh' },
      apiUser,
    )
    expect(clearSession).not.toHaveBeenCalled()
  })

  it('does not publish the user when device registration is unauthorized', async () => {
    vi.mocked(ensureDeviceRegisteredUntilOk).mockResolvedValue({
      ok: false,
      reason: 'unauthorized',
      error: 'Session expired',
    })

    const result = await completeLiveLogin(
      { username: 'caregiver1', password: 'secret', expectedRole: 'caretaker' },
      { setSession, clearSession },
    )

    expect(result).toEqual({ success: false, error: 'invalid_credentials' })
    expect(clearSession).toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('rejects wrong role before touching the device', async () => {
    const result = await completeLiveLogin(
      { username: 'caregiver1', password: 'secret', expectedRole: 'ncda' },
      { setSession, clearSession },
    )

    expect(result).toEqual({ success: false, error: 'wrong_role' })
    expect(setSession).not.toHaveBeenCalled()
    expect(ensureDeviceRegisteredUntilOk).not.toHaveBeenCalled()
  })
})
