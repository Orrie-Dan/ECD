import { useCallback, useEffect, useState } from 'react'
import { getSyncEngine } from '@/sync/sync-engine'
import type { SyncStatusSnapshot } from '@/sync/sync-types'

const EMPTY: SyncStatusSnapshot = {
  status: 'IDLE',
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  blockedCount: 0,
  lastSyncedAt: null,
  lastError: null,
}

export function useSyncStatus(): SyncStatusSnapshot & { syncNow: () => Promise<void> } {
  const [snapshot, setSnapshot] = useState<SyncStatusSnapshot>(EMPTY)

  useEffect(() => {
    const engine = getSyncEngine()
    return engine.subscribe(setSnapshot)
  }, [])

  const syncNow = useCallback(async () => {
    await getSyncEngine().syncNow()
  }, [])

  return { ...snapshot, syncNow }
}
