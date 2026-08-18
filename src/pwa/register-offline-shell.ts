import { registerSW } from 'virtual:pwa-register'
import { env } from '@/config/env'

/**
 * Register the PWA service worker for LIVE builds.
 * Hosted deployments should take over quickly so users do not stay on stale shells.
 */
export function registerOfflineShell(): void {
  if (typeof window === 'undefined') return
  // Skip SW in MOCK unit tests / SSR-less vitest environments without SW support.
  if (!('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Periodic update check when online — does not force reload.
      if (registration && env.isLive) {
        setInterval(
          () => {
            void registration.update()
          },
          60 * 60 * 1000,
        )
      }
    },
    onNeedRefresh() {
      // Force activation so fresh deploys replace the stale shell promptly.
      void updateSW(true)
      if (import.meta.env.DEV) {
        console.info('[pwa] New app shell available — reloading now')
      }
    },
    onOfflineReady() {
      if (import.meta.env.DEV) {
        console.info('[pwa] App shell ready for offline use')
      }
    },
  })
}
