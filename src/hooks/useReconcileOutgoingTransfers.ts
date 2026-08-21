import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTransfersControllerFindOutgoing } from '@/api/generated/endpoints/transfers/transfers'
import { isEcdDirector } from '@/api/roles'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { invalidateChildrenQueries } from '@/features/children/mutations'
import { reconcileOutgoingTransfersLocal } from '@/features/children/transfer-local'
import { getLocalStore } from '@/storage'

/**
 * Origin ECD: keep LocalStore enrollment in sync with outgoing transfer outcomes.
 * Destination accept refreshes the dest device; origin often keeps a stale active row.
 */
export function useReconcileOutgoingTransfers(): void {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canListOutgoing =
    env.isLive && isEcdDirector(user) && Boolean(user?.centerId)

  const outgoingQuery = useTransfersControllerFindOutgoing(
    { pageSize: 100 },
    { query: { enabled: canListOutgoing } },
  )

  const reconcileKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!canListOutgoing || !outgoingQuery.data?.items) return

    const items = outgoingQuery.data.items
    const key = items.map((t) => `${t.id}:${t.status}:${t.version}`).join('|')
    if (key === reconcileKeyRef.current) return
    reconcileKeyRef.current = key

    let cancelled = false
    void (async () => {
      const changed = await reconcileOutgoingTransfersLocal(getLocalStore(), items)
      if (changed && !cancelled) {
        await invalidateChildrenQueries(queryClient)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canListOutgoing, outgoingQuery.data?.items, queryClient])
}
