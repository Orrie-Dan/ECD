import { useMemo } from 'react'
import { useTransfersControllerFindOutgoing } from '@/api/generated/endpoints/transfers/transfers'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import { isEcdCenterUser } from '@/api/roles'
import { env } from '@/config/env'
import { useAuth, useData } from '@/contexts/AppContext'
import { filterEnrolledChildren } from '@/lib/children-utils'
import type { Child } from '@/types'

/**
 * Children currently enrolled at this centre — active only, excluding any with
 * a pending outgoing transfer (still `active` on the server until accepted).
 */
export function useEnrollmentChildren(): Child[] {
  const { user } = useAuth()
  const { children } = useData()
  const isCenterUser = isEcdCenterUser(user)

  const outgoingQuery = useTransfersControllerFindOutgoing(
    { pageSize: 100 },
    { query: { enabled: env.isLive && isCenterUser } },
  )

  const pendingOutgoingChildIds = useMemo(() => {
    const ids = new Set<string>()
    for (const transfer of outgoingQuery.data?.items ?? []) {
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
        pendingOutgoingChildIds.size > 0 ? pendingOutgoingChildIds : undefined,
      ),
    [children, pendingOutgoingChildIds],
  )
}
