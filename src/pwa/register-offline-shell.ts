import { registerSW } from 'virtual:pwa-register'
import { env } from '@/config/env'

/**
 * Register the PWA service worker for LIVE builds.
 * Uses prompt mode — never auto-reload mid-session (caretaker may be recording data).
 * Updated SW waits until the next cold start / explicit refresh.
 */
export function registerOfflineShell(): void {
  if (typeof window === 'undefined') return
  // Skip SW in MOCK unit tests / SSR-less vitest environments without SW support.
  if (!('serviceWorker' in navigator)) return

  registerSW({
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
      // Intentionally no auto-reload. Next navigation/cold start picks up the new shell.
      if (import.meta.env.DEV) {
        console.info('[pwa] New app shell available — will apply on next launch')
      }
    },
    onOfflineReady() {
      if (import.meta.env.DEV) {
        console.info('[pwa] App shell ready for offline use')
      }
    },
  })
}
