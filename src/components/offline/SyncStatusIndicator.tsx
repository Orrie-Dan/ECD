import { env } from '@/config/env'
import { common } from '@/locales/rw/common'
import { useNetworkState } from '@/network'
import { usePendingSyncSummary } from '@/sync/use-pending-summary'
import { classifyBlockedReason } from '@/sync/failure-class'
import { Button } from '@/components/ui/Button'

function formatTime(iso: string | null): string {
  if (!iso) return common.sync.lastSyncedNever
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return common.sync.lastSyncedNever
  }
}

function statusLabel(
  syncStatus: string,
  networkStatus: string,
  failedCount: number,
  pendingCount: number,
  blockedCount: number,
  lastError?: string | null,
): { label: string; tone: string } {
  if (syncStatus === 'AUTH_REQUIRED') {
    return { label: common.sync.signInRequired, tone: 'text-warning' }
  }
  if (syncStatus === 'DEVICE_BLOCKED') {
    return { label: common.sync.deviceBlocked, tone: 'text-warning' }
  }
  if (
    syncStatus === 'DEVICE_PENDING' ||
    lastError === 'Device not registered' ||
    lastError === 'No active local owner'
  ) {
    return { label: common.sync.devicePending, tone: 'text-warning' }
  }
  if (syncStatus === 'SERVER_UNAVAILABLE') {
    return { label: common.sync.serverUnavailable, tone: 'text-warning' }
  }
  if (networkStatus === 'OFFLINE' || syncStatus === 'OFFLINE') {
    return { label: common.sync.offline, tone: 'text-warning' }
  }
  if (networkStatus === 'RECONNECTING') {
    return { label: common.sync.reconnecting, tone: 'text-primary' }
  }
  if (syncStatus === 'SYNCING') {
    return { label: common.sync.syncing, tone: 'text-primary' }
  }
  if (blockedCount > 0 && pendingCount === blockedCount && failedCount === 0) {
    return { label: common.sync.needsAttention, tone: 'text-warning' }
  }
  if (syncStatus === 'PENDING' || pendingCount > 0) {
    return { label: common.sync.waitingToSync, tone: 'text-warning' }
  }
  if (syncStatus === 'SYNC_ERROR') {
    return {
      label: failedCount > 0 ? common.sync.couldntSync : common.sync.failed,
      tone: 'text-error',
    }
  }
  if (syncStatus === 'CONFLICT_PRESENT') {
    return { label: common.sync.needsAttention, tone: 'text-warning' }
  }
  return { label: common.sync.synced, tone: 'text-text-secondary' }
}

/**
 * Compact shell indicator — visible on mobile and desktop.
 * Tap triggers sync when not already syncing.
 */
export function SyncStatusIndicator() {
  const network = useNetworkState()
  const sync = usePendingSyncSummary()

  if (env.isMock) return null

  const { label, tone } = statusLabel(
    sync.status,
    network.status,
    sync.failedCount,
    sync.pendingCount,
    sync.blockedCount ?? 0,
    sync.lastError,
  )
  const busy = sync.status === 'SYNCING'
  const pending =
    sync.pendingCount > 0
      ? common.sync.pending.replace('{count}', String(sync.pendingCount))
      : null
  const conflict =
    sync.conflictCount > 0
      ? common.sync.conflictCount.replace('{count}', String(sync.conflictCount))
      : null

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!busy) void sync.syncNow()
      }}
      className="touch-target flex flex-col items-end justify-center max-w-[6.5rem] sm:max-w-[12rem] text-right px-1.5 sm:px-2 py-1 rounded-lg hover:bg-background-subtle transition-colors disabled:opacity-70"
      title={busy ? common.sync.syncingBusy : common.sync.tapToSync}
      aria-label={common.sync.statusPanelTitle}
    >
      <span className={`text-caption font-medium leading-tight truncate max-w-full ${tone}`}>{label}</span>
      {pending && (
        <span className="hidden sm:block text-[11px] text-text-muted leading-tight">{pending}</span>
      )}
      {conflict && (
        <span className="hidden sm:block text-[11px] text-warning leading-tight">{conflict}</span>
      )}
      {sync.pendingCount === 0 && sync.failedCount === 0 && sync.status === 'IDLE' ? (
        <span className="hidden sm:block text-[11px] text-text-muted leading-tight">
          {common.sync.lastSynced.replace('{time}', formatTime(sync.lastSyncedAt))}
        </span>
      ) : null}
    </button>
  )
}

/** Compact badge for forms after local-first save. */
export function SavedOnDeviceBadge({ show }: { show: boolean }) {
  if (!show || env.isMock) return null
  return (
    <p className="text-caption text-primary mt-2" role="status">
      {common.sync.savedOnDevice}
      <span className="block text-text-muted">{common.sync.savedOnDeviceHint}</span>
    </p>
  )
}

/**
 * Pending-work surface for Settings / sync panel.
 * Groups pending counts by domain — never exposes raw outbox ops.
 */
export function PendingSyncPanel({ className = '' }: { className?: string }) {
  const network = useNetworkState()
  const sync = usePendingSyncSummary()

  if (env.isMock) return null

  const { label, tone } = statusLabel(
    sync.status,
    network.status,
    sync.failedCount,
    sync.pendingCount,
    sync.blockedCount ?? 0,
    sync.lastError,
  )
  const busy = sync.status === 'SYNCING' || sync.acknowledging

  return (
    <div className={`rounded-xl border border-border bg-background-subtle p-4 ${className}`}>
      <h3 className="text-subheading text-text mb-3">{common.sync.statusPanelTitle}</h3>
      <p className={`text-body font-medium ${tone}`}>{label}</p>
      {sync.pendingCount === 0 && sync.failedCount === 0 && sync.status === 'IDLE' ? (
        <p className="text-caption text-text-muted mt-1">
          {common.sync.lastSynced.replace('{time}', formatTime(sync.lastSyncedAt))}
        </p>
      ) : (
        <p className="text-caption text-text-muted mt-1">{common.sync.savedOnDeviceHint}</p>
      )}
      <p className="text-caption text-text-muted mt-1">
        {common.sync.diagnosticQueue
          .replace('{pending}', String(sync.pendingCount))
          .replace('{failed}', String(sync.failedCount))
          .replace('{conflict}', String(sync.conflictCount))}
      </p>
      <p className="text-body text-text mt-3">
        {common.sync.pending.replace('{count}', String(sync.pendingCount))}
      </p>
      {sync.conflictCount > 0 && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning-light/30 p-3 space-y-2">
          <p className="text-caption font-semibold text-warning">
            {common.sync.conflictCount.replace('{count}', String(sync.conflictCount))}
          </p>
          <p className="text-caption text-text-secondary">{common.sync.conflictServerWins}</p>
          {sync.conflictItems.length > 0 && (
            <ul className="space-y-1.5">
              {sync.conflictItems.map((item) => (
                <li key={item.clientOperationId} className="text-body text-text">
                  {common.sync.conflictItem.replace('{label}', item.label)}
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption text-text-muted">{common.sync.conflictContactSupport}</p>
          <p className="text-caption text-text-muted">{common.sync.conflictAcknowledgeHint}</p>
          <Button
            variant="secondary"
            className="mt-1"
            fullWidth
            disabled={busy || network.status === 'OFFLINE' || sync.status === 'AUTH_REQUIRED'}
            onClick={() => void sync.acknowledgeConflicts()}
          >
            {common.sync.conflictAcknowledge}
          </Button>
        </div>
      )}
      {sync.failedCount > 0 && (
        <div className="mt-3 rounded-lg border border-error/30 p-3 space-y-2">
          <p className="text-caption font-semibold text-error">
            {common.sync.failedCount.replace('{count}', String(sync.failedCount))}
          </p>
          {sync.failedItems.length > 0 && (
            <ul className="space-y-1.5">
              {sync.failedItems.map((item) => (
                <li key={item.clientOperationId} className="text-body text-text">
                  {common.sync.failedItem.replace('{label}', item.label)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {(sync.blockedCount ?? 0) > 0 && (
        <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
          {sync.blockedItems.some(
            (item) => classifyBlockedReason(item.lastError) === 'village_reference',
          ) ? (
            <>
              <p className="text-caption font-semibold text-text-secondary">
                {common.sync.blockedVillageCount.replace(
                  '{count}',
                  String(sync.blockedCount),
                )}
              </p>
              <p className="text-caption text-text-muted">{common.sync.blockedVillageHint}</p>
            </>
          ) : (
            <p className="text-caption font-semibold text-text-secondary">
              {common.sync.blockedCount.replace('{count}', String(sync.blockedCount))}
            </p>
          )}
          {sync.blockedItems.length > 0 && (
            <ul className="space-y-1.5">
              {sync.blockedItems.map((item) => (
                <li key={item.clientOperationId} className="text-body text-text">
                  {classifyBlockedReason(item.lastError) === 'village_reference'
                    ? common.sync.blockedVillageItem.replace('{label}', item.label)
                    : common.sync.blockedItem.replace('{label}', item.label)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {sync.byDomain.length > 0 && (
        <div className="mt-3">
          <p className="text-caption text-text-muted mb-1">{common.sync.byDomain}</p>
          <ul className="space-y-1">
            {sync.byDomain.map((row) => (
              <li key={row.key} className="text-body text-text flex justify-between gap-4">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button
        variant="primary"
        className="mt-4"
        fullWidth
        disabled={busy || network.status === 'OFFLINE' || sync.status === 'AUTH_REQUIRED'}
        onClick={() => void sync.syncNow()}
      >
        {busy ? common.sync.syncingBusy : common.sync.syncNow}
      </Button>
    </div>
  )
}
