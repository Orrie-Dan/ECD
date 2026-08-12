import { devicesControllerRegister } from '@/api/generated/endpoints/devices/devices'
import { tokenStorage } from '@/api/token-storage'
import { createUuid } from '@/lib/uuid'
import { getLocalStore, ensureLocalStoreInitialized, type LocalStore } from '@/storage'
import { META_KEYS } from '@/storage/types'
import { normalizeApiError } from '@/api/errors'
import { env } from '@/config/env'

const DEVICE_UUID_STORAGE_KEY = 'ecd_device_uuid'

function readOrCreateDeviceUuid(): string {
  const existing = localStorage.getItem(DEVICE_UUID_STORAGE_KEY)
  if (existing) return existing
  const next = createUuid()
  localStorage.setItem(DEVICE_UUID_STORAGE_KEY, next)
  return next
}

export type EnsureDeviceResult =
  | { ok: true; deviceId: string; deviceUuid: string }
  | { ok: false; reason: 'mock' | 'network' | 'unauthorized' | 'error'; error?: string }

/**
 * Idempotent device registration for LIVE mode.
 * Persists registry UUID to tokenStorage (x-device-id) and LocalStore.
 * Does not wipe offline data on failure.
 */
export async function ensureDeviceRegistered(options?: {
  userId?: string
  centerId?: string
  store?: LocalStore
}): Promise<EnsureDeviceResult> {
  if (env.isMock) {
    return { ok: false, reason: 'mock' }
  }

  const store = options?.store ?? getLocalStore()
  await ensureLocalStoreInitialized(store)

  const deviceUuid = readOrCreateDeviceUuid()
  const existingRegistryId = tokenStorage.getDeviceId() ?? (await store.getMeta(META_KEYS.deviceId))

  // Already registered on this browser — refresh local binding without re-POSTing when possible.
  // Update userId/centerId on the local device row so meta tracks the active account without
  // creating a duplicate backend device.
  if (existingRegistryId) {
    const device = await store.getDevice()
    if (device?.id === existingRegistryId) {
      tokenStorage.setDeviceId(existingRegistryId)
      const nextUserId = options?.userId ?? device.userId
      const nextCenterId = options?.centerId ?? device.centerId
      if (nextUserId !== device.userId || nextCenterId !== device.centerId) {
        await store.upsertDevice({
          ...device,
          userId: nextUserId,
          centerId: nextCenterId,
          lastSeenAt: new Date().toISOString(),
        })
      } else {
        await store.setMeta(META_KEYS.deviceId, existingRegistryId)
        await store.setMeta(META_KEYS.deviceUuid, device.deviceUuid)
        if (options?.userId) await store.setMeta(META_KEYS.userId, options.userId)
        if (options?.centerId) await store.setMeta(META_KEYS.centerId, options.centerId)
      }
      return { ok: true, deviceId: existingRegistryId, deviceUuid: device.deviceUuid }
    }
    // Registry id known in localStorage but missing from this user workspace — mirror it.
    if (options?.userId) {
      await store.upsertDevice({
        id: existingRegistryId,
        deviceUuid,
        userId: options.userId,
        centerId: options.centerId,
        registeredAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      })
      tokenStorage.setDeviceId(existingRegistryId)
      return { ok: true, deviceId: existingRegistryId, deviceUuid }
    }
  }

  try {
    const response = await devicesControllerRegister({
      deviceUuid,
      platform: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'web',
      appVersion: '0.0.0',
    })

    tokenStorage.setDeviceId(response.id)

    await store.upsertDevice({
      id: response.id,
      deviceUuid: response.deviceUuid,
      userId: options?.userId ?? (await store.getMeta(META_KEYS.userId)) ?? 'unknown',
      centerId: options?.centerId,
      registeredAt: response.registeredAt,
      lastSeenAt: response.lastSeenAt ?? undefined,
    })

    return { ok: true, deviceId: response.id, deviceUuid: response.deviceUuid }
  } catch (error) {
    const apiError = normalizeApiError(error)
    if (apiError.isUnauthorized) {
      return { ok: false, reason: 'unauthorized', error: apiError.message }
    }
    if (apiError.isNetworkError) {
      return { ok: false, reason: 'network', error: apiError.message }
    }
    return { ok: false, reason: 'error', error: apiError.message }
  }
}

/** Stable client device UUID (not the registry id). Kept across logins on same browser. */
export function getClientDeviceUuid(): string {
  return readOrCreateDeviceUuid()
}
