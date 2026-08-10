import type { ReactNode } from 'react'
import { QueryProvider } from '@/api/providers/QueryProvider'
import { ApiAuthProvider } from '@/api/auth/ApiAuthProvider'
import { OfflineRuntimeProvider } from '@/offline/OfflineRuntimeProvider'
import { env } from '@/config/env'

/**
 * Infrastructure providers only — does not replace mock AuthProvider / DataProvider.
 * Wrap the existing app tree so LIVE hooks and JWT session are available when needed.
 */
export function ApiProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ApiAuthProvider>
        {env.isLive ? <OfflineRuntimeProvider>{children}</OfflineRuntimeProvider> : children}
      </ApiAuthProvider>
    </QueryProvider>
  )
}
