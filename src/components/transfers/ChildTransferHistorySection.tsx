import { useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useCentersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import type { TransferResponseDto } from '@/api/generated/models/transferResponseDto'
import { useAuth } from '@/contexts/AppContext'
import { env } from '@/config/env'
import { useChildTransferHistory } from '@/features/children'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'

const STATUS_BADGE: Record<string, BadgeVariant> = {
  pending: 'warning',
  accepted: 'success',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  pending: caretaker.incomingTransfers.statusPending,
  accepted: caretaker.incomingTransfers.statusAccepted,
  cancelled: 'Byahagaritswe',
}

function reasonLabel(reason: string): string {
  const key = reason as keyof typeof caretaker.transfer.reasons
  return caretaker.transfer.reasons[key] ?? reason
}

function TransferHistoryRow({
  transfer,
  centerName,
}: {
  transfer: TransferResponseDto
  centerName: (id: string) => string
}) {
  return (
    <li className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowLeftRight size={16} className="text-primary shrink-0" aria-hidden />
          <p className="text-body font-semibold text-text truncate">
            {centerName(transfer.fromCenterId)} → {centerName(transfer.toCenterId)}
          </p>
        </div>
        <Badge variant={STATUS_BADGE[transfer.status] ?? 'neutral'}>
          {STATUS_LABEL[transfer.status] ?? transfer.status}
        </Badge>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
        <div>
          <dt className="text-text-muted">{caretaker.incomingTransfers.transferDate}</dt>
          <dd className="text-text font-medium">{formatDate(transfer.transferDate)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{caretaker.transfer.reason}</dt>
          <dd className="text-text font-medium truncate">{reasonLabel(transfer.reason)}</dd>
        </div>
        {transfer.acceptedAt && transfer.status === TransferStatus.accepted ? (
          <div>
            <dt className="text-text-muted">{caretaker.incomingTransfers.statusAccepted}</dt>
            <dd className="text-text font-medium">{formatDate(transfer.acceptedAt)}</dd>
          </div>
        ) : null}
        {transfer.notes?.trim() ? (
          <div className="sm:col-span-2">
            <dt className="text-text-muted">{caretaker.transfer.notes}</dt>
            <dd className="text-text font-medium whitespace-pre-wrap">{transfer.notes}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  )
}

interface ChildTransferHistorySectionProps {
  childId: string
}

export function ChildTransferHistorySection({ childId }: ChildTransferHistorySectionProps) {
  const { user } = useAuth()
  const historyQuery = useChildTransferHistory(childId, { page: 1, pageSize: 50 }, env.isLive)
  const centersQuery = useCentersControllerFindAll(
    { districtId: user?.districtId, pageSize: 100 },
    { query: { enabled: env.isLive && Boolean(user?.districtId) } },
  )

  const centerNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const center of centersQuery.data?.items ?? []) {
      map.set(center.id, center.name)
    }
    return map
  }, [centersQuery.data?.items])

  const resolveCenter = (id: string) => centerNameMap.get(id) ?? id.slice(0, 8)

  if (!env.isLive) return null

  if (historyQuery.isError) {
    return (
      <LiveUnavailableState
        title={caretaker.transfer.historyTitle}
        description={caretaker.transfer.historyUnavailable}
        action={
          <Button variant="primary" size="sm" onClick={() => void historyQuery.refetch()}>
            {common.reset}
          </Button>
        }
      />
    )
  }

  if (historyQuery.isLoading) {
    return (
      <Card padding="lg">
        <h3 className="text-label text-primary mb-4">{caretaker.transfer.historyTitle}</h3>
        <p className="text-caption text-text-muted mb-3">{caretaker.transfer.historyLoading}</p>
        <Skeleton className="h-20 w-full mb-2" />
        <Skeleton className="h-20 w-full" />
      </Card>
    )
  }

  const items = historyQuery.data?.items ?? []
  const total = historyQuery.data?.total ?? items.length

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-label text-primary">{caretaker.transfer.historyTitle}</h3>
        {total > 0 ? (
          <span className="text-caption font-semibold text-text-muted">
            {caretaker.transfer.historyCount.replace('{count}', String(total))}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div>
          <p className="text-body font-semibold text-text-secondary">
            {caretaker.transfer.historyEmpty}
          </p>
          <p className="text-caption text-text-muted mt-1">
            {caretaker.transfer.historyEmptyDesc}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((transfer) => (
            <TransferHistoryRow
              key={transfer.id}
              transfer={transfer}
              centerName={resolveCenter}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}
