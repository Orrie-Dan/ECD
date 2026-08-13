import { devicesControllerRegister } from '@/api/generated/endpoints/devices/devices'
import { tokenStorage } from '@/api/token-storage'
import { createUuid } from '@/lib/uuid'
import { getLocalStore, ensureLocalStoreInitialized, type LocalStore } from '@/storage'
import { META_KEYS } from '@/storage/types'
import { normalizeApiError } from '@/api/errors'
import { env } from '@/config/env'

const DEVICE_UUID_STORAGE_KEY = 'ecd_device_uuid'

function writeDeviceUuid(uuid: string): void {
  try {
    localStorage.setItem(DEVICE_UUID_STORAGE_KEY, uuid)
  } catch {
    /* ignore quota */
  }
}

/** Clear browser-global device keys so the next account cannot inherit them. */
export function clearBrowserDeviceIdentity(): void {
  tokenStorage.clearDeviceId()
  try {
    localStorage.removeItem(DEVICE_UUID_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function mintDeviceUuid(): string {
  const next = createUuid()
  writeDeviceUuid(next)
  return next
}

export type EnsureDeviceResult =
  | { ok: true; deviceId: string; deviceUuid: string }
  | { ok: false; reason: 'mock' | 'network' | 'unauthorized' | 'error'; error?: string }

async function persistBinding(
  store: LocalStore,
  response: {
    id: string
    deviceUuid: string
    registeredAt: string
    lastSeenAt?: string | null
  },
  options?: { userId?: string; centerId?: string },
): Promise<void> {
  tokenStorage.setDeviceId(response.id)
  writeDeviceUuid(response.deviceUuid)
  await store.upsertDevice({
    id: response.id,
    deviceUuid: response.deviceUuid,
    userId: options?.userId ?? (await store.getMeta(META_KEYS.userId)) ?? 'unknown',
    centerId: options?.centerId,
    registeredAt: response.registeredAt,
    lastSeenAt: response.lastSeenAt ?? undefined,
  })
}

async function registerOnce(
  deviceUuid: string,
): Promise<{
  id: string
  deviceUuid: string
  registeredAt: string
  lastSeenAt?: string | null
}> {
  return devicesControllerRegister({
    deviceUuid,
    platform: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'web',
    appVersion: '0.0.0',
  })
}

/**
 * Idempotent device registration for LIVE mode.
 *
 * Device identity is bound to the authenticated user:
 * - Same user: restore UUID from this workspace's IndexedDB row and re-register.
 * - After logout / other user: never reuse `ecd_device_id` / `ecd_device_uuid`
 *   from localStorage; never mirror another user's registry id.
 * - 409 (UUID owned by another user): mint a new UUID and register once more.
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

  const localDevice = await store.getDevice()
  const sameUser =
    Boolean(localDevice) &&
    Boolean(options?.userId) &&
    localDevice!.userId === options!.userId

  // Logout clears localStorage device keys. Restore from this workspace so
  // sync is not stuck DEVICE_PENDING while /devices/register is in flight.
  if (sameUser && localDevice) {
    tokenStorage.setDeviceId(localDevice.id)
    writeDeviceUuid(localDevice.deviceUuid)
  }

  let deviceUuid = sameUser ? localDevice!.deviceUuid : mintDeviceUuid()

  const tryRegister = async (uuid: string): Promise<EnsureDeviceResult> => {
    try {
      const response = await registerOnce(uuid)
      await persistBinding(store, response, options)
      return { ok: true, deviceId: response.id, deviceUuid: response.deviceUuid }
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.isUnauthorized) {
        return { ok: false, reason: 'unauthorized', error: apiError.message }
      }
      if (apiError.isNetworkError) {
        if (sameUser && localDevice) {
          tokenStorage.setDeviceId(localDevice.id)
          return { ok: true, deviceId: localDevice.id, deviceUuid: localDevice.deviceUuid }
        }
        return { ok: false, reason: 'network', error: apiError.message }
      }
      if (apiError.isConflict) {
        return { ok: false, reason: 'error', error: apiError.message }
      }
      return { ok: false, reason: 'error', error: apiError.message }
    }
  }

  let result = await tryRegister(deviceUuid)
  if (!result.ok && result.error && /already registered to another user/i.test(result.error)) {
    deviceUuid = mintDeviceUuid()
    result = await tryRegister(deviceUuid)
  }

  return result
}

/** Stable client device UUID for the current account session (not the registry id). */
export function getClientDeviceUuid(): string {
  try {
    const existing = localStorage.getItem(DEVICE_UUID_STORAGE_KEY)
    if (existing) return existing
  } catch {
    /* ignore */
  }
  return mintDeviceUuid()
}
