import { useEffect, useRef, type ReactNode } from 'react'
import { env } from '@/config/env'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { ensureLocalStoreInitialized, getLocalStore } from '@/storage'
import { activateLocalWorkspace } from '@/storage/local-workspace'
import { getActiveOwnerUserId } from '@/storage/ownership'
import { networkState } from '@/network/network-state'
import { getSyncEngine } from '@/sync/sync-engine'
import { ensureDeviceRegistered } from '@/features/device'
import { unblockChildCreatesNeedingVillage } from '@/features/children/local-children'
import { resolveHomeVillageId } from '@/api/resources/children'
import { notifyDeviceRegistrationFailed } from '@/offline/DeviceRegistrationBridge'
import { SYNC_HEARTBEAT_MS } from '@/sync/sync-types'
import { tokenStorage } from '@/api/token-storage'

/**
 * LIVE-only offline runtime: bind local owner, device ensure, network listeners, sync.
 * Reconnect triggers coalesce through SyncEngine.syncNow() (single in-flight cycle).
 * MOCK mode: no-op.
 */
export function OfflineRuntimeProvider({ children }: { children: ReactNode }) {
  const apiAuth = useApiAuth()
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!env.isLive) return

    networkState.start()
    void ensureLocalStoreInitialized()

    const requestSync = () => {
      // Debounce bursty online events; SyncEngine also dedupes concurrent syncNow().
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => {
        void (async () => {
          await unblockChildCreatesNeedingVillage(getLocalStore(), resolveHomeVillageId)
          await getSyncEngine().syncNow()
        })()
      }, 400)
    }

    const unsubNet = networkState.subscribe((snap) => {
      if (snap.status === 'RECONNECTING' || snap.status === 'ONLINE') {
        requestSync()
      }
    })

    const heartbeat = setInterval(() => {
      const snap = networkState.getSnapshot()
      if (snap.status === 'OFFLINE') return
      requestSync()
    }, SYNC_HEARTBEAT_MS)

    return () => {
      unsubNet()
      networkState.stop()
      clearInterval(heartbeat)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!env.isLive) return
    if (apiAuth.status !== 'authenticated' || !apiAuth.accessToken) return
    const userId = apiAuth.apiUser?.id
    if (!userId) return

    let cancelled = false
    void (async () => {
      // Authenticated but device/workspace not ready yet — distinct from AUTH_REQUIRED.
      getSyncEngine().setAuthRequired(false)
      const engine = getSyncEngine()
      // Soft signal via syncNow short-circuit once owner/device missing.
      try {
        await activateLocalWorkspace(userId, apiAuth.apiUser?.centerId ?? undefined)
      } catch {
        // Stale activation superseded by a newer login — ignore.
        return
      }
      if (cancelled) return
      if (getActiveOwnerUserId() !== userId) return

      const existingDevice = await getLocalStore().getDevice()
      if (existingDevice?.id) {
        tokenStorage.setDeviceId(existingDevice.id)
      }

      const result = await ensureDeviceRegistered({
        userId,
        centerId: apiAuth.apiUser?.centerId ?? undefined,
      })
      if (cancelled || getActiveOwnerUserId() !== userId) return
      if (!result.ok && result.reason === 'unauthorized') {
        engine.setAuthRequired(true)
        return
      }
      if (!result.ok && result.reason === 'network') {
        notifyDeviceRegistrationFailed('network')
        // Fall through — workspace device id may already be restored.
      }
      if (!result.ok && result.reason === 'error') {
        notifyDeviceRegistrationFailed('error')
      }
      // Registration failure must not wipe local data. If a workspace device
      // id exists, sync anyway (harness always had a device id; UI logout
      // used to leave DEVICE_PENDING with the button disabled).
      engine.setAuthRequired(false)
      await unblockChildCreatesNeedingVillage(getLocalStore(), resolveHomeVillageId)
      if (cancelled || getActiveOwnerUserId() !== userId) return
      await engine.waitUntilIdle()
      await engine.syncNow()
    })()

    return () => {
      cancelled = true
    }
  }, [apiAuth.status, apiAuth.accessToken, apiAuth.apiUser?.id, apiAuth.apiUser?.centerId])

  return <>{children}</>
}
