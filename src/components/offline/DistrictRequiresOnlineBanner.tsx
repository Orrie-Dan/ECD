import { env } from '@/config/env'
import { common } from '@/locales/rw/common'
import { Alert } from '@/components/ui/Alert'
import { networkState } from '@/network/network-state'
import { useSyncExternalStore } from 'react'

/**
 * District monitoring/reporting requires live API data.
 * When offline, show an explicit connection requirement — never a misleading empty chart.
 */
export function DistrictRequiresOnlineBanner({
  className = '',
}: {
  className?: string
}) {
  const online = useSyncExternalStore(
    (onStoreChange) => networkState.subscribe(() => onStoreChange()),
    () => networkState.getSnapshot().isOnline,
    () => true,
  )

  if (env.isMock || online) return null

  return (
    <Alert variant="warning" className={className}>
      <p className="font-semibold text-text">{common.sync.requiresInternetTitle}</p>
      <p className="text-body text-text-secondary mt-1">{common.sync.requiresInternetBody}</p>
    </Alert>
  )
}
