import { env } from '@/config/env'
import { common } from '@/locales/rw/common'
import { Alert } from '@/components/ui/Alert'

/**
 * Shown when LIVE + offline (or REST bootstrap failed) and LocalStore has no snapshot.
 * Never falls back to MOCK data.
 */
export function OfflineEmptyState({
  className = '',
}: {
  className?: string
}) {
  if (env.isMock) return null
  return (
    <Alert variant="warning" className={className}>
      <p className="font-semibold text-text">{common.sync.noLocalSnapshotTitle}</p>
      <p className="text-body text-text-secondary mt-1">{common.sync.noLocalSnapshotBody}</p>
    </Alert>
  )
}
