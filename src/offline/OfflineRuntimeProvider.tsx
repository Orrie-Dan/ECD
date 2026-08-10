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

    return () => {
      unsubNet()
      networkState.stop()
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
      try {
        await activateLocalWorkspace(userId, apiAuth.apiUser?.centerId ?? undefined)
      } catch {
        // Stale activation superseded by a newer login — ignore.
        return
      }
      if (cancelled) return
      if (getActiveOwnerUserId() !== userId) return

      const result = await ensureDeviceRegistered({
        userId,
        centerId: apiAuth.apiUser?.centerId ?? undefined,
      })
      if (cancelled || getActiveOwnerUserId() !== userId) return
      if (!result.ok && result.reason === 'unauthorized') {
        getSyncEngine().setAuthRequired(true)
        return
      }
      // Registration failure must not wipe local data; sync may be blocked until device exists.
      if (result.ok) {
        getSyncEngine().setAuthRequired(false)
        await unblockChildCreatesNeedingVillage(getLocalStore(), resolveHomeVillageId)
        if (cancelled || getActiveOwnerUserId() !== userId) return
        await getSyncEngine().syncNow()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiAuth.status, apiAuth.accessToken, apiAuth.apiUser?.id, apiAuth.apiUser?.centerId])

  return <>{children}</>
}
