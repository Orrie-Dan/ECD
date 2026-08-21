import { useMemo } from 'react'
import { useTransfersControllerFindOutgoing } from '@/api/generated/endpoints/transfers/transfers'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import { isEcdDirector } from '@/api/roles'
import { env } from '@/config/env'
import { useAuth, useData } from '@/contexts/AppContext'
import { useReconcileOutgoingTransfers } from '@/hooks/useReconcileOutgoingTransfers'
import { filterEnrolledChildren } from '@/lib/children-utils'
import type { Child } from '@/types'

/**
 * Children currently enrolled at this centre — active only, excluding any with
 * a pending outgoing transfer (still `active` on the server until accepted).
 *
 * Outgoing transfers are ECD-director scoped on the API — caregivers get 403.
 * Caregivers rely on local `transferred` status after a director initiates,
 * plus sync pull adjustments when the child moves centre.
 */
export function useEnrollmentChildren(): Child[] {
  const { user } = useAuth()
  const { children } = useData()
  const canListOutgoing =
    env.isLive && isEcdDirector(user) && Boolean(user?.centerId)

  useReconcileOutgoingTransfers()

  const outgoingQuery = useTransfersControllerFindOutgoing(
    { pageSize: 100 },
    { query: { enabled: canListOutgoing } },
  )

  const excludeOutgoingChildIds = useMemo(() => {
    const ids = new Set<string>()
    for (const transfer of outgoingQuery.data?.items ?? []) {
      // Hide pending immediately; accepted are removed via reconcile (status/centerId).
      if (transfer.status === TransferStatus.pending) {
        ids.add(transfer.childId)
      }
    }
    return ids
  }, [outgoingQuery.data?.items])

  return useMemo(
    () =>
      filterEnrolledChildren(
        children,
        excludeOutgoingChildIds.size > 0 ? excludeOutgoingChildIds : undefined,
      ),
    [children, excludeOutgoingChildIds],
  )
}
