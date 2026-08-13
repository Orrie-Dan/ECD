import { useEffect, useRef, type ReactNode } from 'react'
import { env } from '@/config/env'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { ensureLocalStoreInitialized, getLocalStore } from '@/storage'
import { activateLocalWorkspace } from '@/storage/local-workspace'
import { getActiveOwnerUserId } from '@/storage/ownership'
import { networkState } from '@/network/network-state'
import { getSyncEngine } from '@/sync/sync-engine'
import { ensureDeviceRegisteredUntilOk } from '@/features/device'
import { unblockChildCreatesNeedingVillage } from '@/features/children/local-children'
import { resolveHomeVillageId } from '@/api/resources/children'
import { nextSyncDelay } from '@/sync/sync-types'
import { tokenStorage } from '@/api/token-storage'

/**
 * LIVE-only offline runtime: bind local owner, device ensure, network listeners,
 * and a continuous automatic sync loop while the session is authenticated.
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

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let wake: (() => void) | null = null
    const abort = new AbortController()

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        wake = resolve
        timer = setTimeout(() => {
          wake = null
          resolve()
        }, ms)
      })

    void (async () => {
      const userId = apiAuth.apiUser?.id
      if (!userId) return

      getSyncEngine().setAuthRequired(false)
      const engine = getSyncEngine()
      try {
        await activateLocalWorkspace(userId, apiAuth.apiUser?.centerId ?? undefined)
      } catch {
        return
      }
      if (cancelled) return
      if (getActiveOwnerUserId() !== userId) return

      const existingDevice = await getLocalStore().getDevice()
      if (existingDevice?.id) {
        tokenStorage.setDeviceId(existingDevice.id)
      }

      const result = await ensureDeviceRegisteredUntilOk({
        userId,
        centerId: apiAuth.apiUser?.centerId ?? undefined,
        sleepFn: sleep,
        signal: abort.signal,
      })
      if (cancelled || getActiveOwnerUserId() !== userId) return
      if (!result.ok && result.reason === 'unauthorized') {
        engine.setAuthRequired(true)
        return
      }

      engine.setAuthRequired(false)
      await unblockChildCreatesNeedingVillage(getLocalStore(), resolveHomeVillageId)
      if (cancelled || getActiveOwnerUserId() !== userId) return

      while (!cancelled) {
        const snap = networkState.getSnapshot()
        if (snap.status !== 'OFFLINE') {
          await unblockChildCreatesNeedingVillage(getLocalStore(), resolveHomeVillageId)
          if (cancelled || getActiveOwnerUserId() !== userId) return
          await engine.waitUntilIdle()
          if (cancelled || getActiveOwnerUserId() !== userId) return
          await engine.syncNow()
        }
        if (cancelled) return
        const status = (await engine.getSnapshot()).status
        await sleep(nextSyncDelay(status))
      }
    })()

    return () => {
      cancelled = true
      abort.abort()
      if (timer) clearTimeout(timer)
      wake?.()
    }
  }, [apiAuth.status, apiAuth.accessToken, apiAuth.apiUser?.id, apiAuth.apiUser?.centerId])

  return <>{children}</>
}
