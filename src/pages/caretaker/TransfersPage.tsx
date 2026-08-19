import { useState, useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Send } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { Button } from '@/components/ui/Button'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import {
  useTransfersControllerFindIncoming,
  useTransfersControllerFindOutgoing,
  useTransfersControllerAccept,
  useTransfersControllerCancel,
  getTransfersControllerFindIncomingQueryKey,
  getTransfersControllerFindOutgoingQueryKey,
} from '@/api/generated/endpoints/transfers/transfers'
import type { TransferResponseDto } from '@/api/generated/models'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import { TransferDetailModal } from '@/components/transfers/TransferDetailModal'
import {
  getChildrenControllerFindOneQueryOptions,
} from '@/api/generated/endpoints/children/children'
import { useCentersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import { useData } from '@/contexts/AppContext'
import { useQueryClient, useQueries } from '@tanstack/react-query'

type Tab = 'incoming' | 'outgoing'

const TAB_OPTIONS = [
  { id: 'incoming' as const, label: caretaker.incomingTransfers.title },
  { id: 'outgoing' as const, label: caretaker.nav.transfers },
]

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

const STATUS_FILTER_OPTIONS: { value: 'all' | TransferStatus; label: string }[] = [
  { value: TransferStatus.pending, label: caretaker.incomingTransfers.statusPending },
  { value: TransferStatus.accepted, label: caretaker.incomingTransfers.statusAccepted },
  { value: TransferStatus.cancelled, label: 'Byahagaritswe' },
  { value: 'all', label: 'Byose' },
]

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('rw-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function TransferCard({
  transfer,
  direction,
  onView,
  childName,
  fromCenterName,
  toCenterName,
}: {
  transfer: TransferResponseDto
  direction: Tab
  onView: (t: TransferResponseDto) => void
  childName: string
  fromCenterName: string
  toCenterName: string
}) {
  const isPending = transfer.status === TransferStatus.pending

  return (
    <Card hover onClick={() => onView(transfer)} padding="none">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {direction === 'incoming' ? (
              <ArrowDownLeft size={18} className="text-success shrink-0" />
            ) : (
              <ArrowUpRight size={18} className="text-primary shrink-0" />
            )}
            <p className="text-body font-semibold text-text truncate">
              {childName}
            </p>
          </div>
          <Badge variant={STATUS_BADGE[transfer.status] ?? 'neutral'}>
            {STATUS_LABEL[transfer.status] ?? transfer.status}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption">
          <div>
            <dt className="text-text-muted">{caretaker.incomingTransfers.sourceCenter}</dt>
            <dd className="text-text font-medium truncate">{fromCenterName}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{caretaker.incomingTransfers.destinationCenter}</dt>
            <dd className="text-text font-medium truncate">{toCenterName}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{caretaker.incomingTransfers.transferDate}</dt>
            <dd className="text-text font-medium">{formatDate(transfer.transferDate)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{caretaker.transfer.reason}</dt>
            <dd className="text-text font-medium truncate">{transfer.reason}</dd>
          </div>
        </dl>

        {isPending && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-caption text-primary font-semibold">
              {direction === 'incoming'
                ? caretaker.incomingTransfers.accept
                : caretaker.incomingTransfers.viewDetails}
              {' →'}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

function TransferListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  )
}

export function TransfersPage() {
  const [tab, setTab] = useState<Tab>('incoming')
  const [statusFilter, setStatusFilter] = useState<'all' | TransferStatus>(TransferStatus.pending)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferResponseDto | null>(null)
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { children } = useData()

  const incomingQuery = useTransfersControllerFindIncoming(
    { page: tab === 'incoming' ? page : 1, pageSize },
  )

  const outgoingQuery = useTransfersControllerFindOutgoing(
    { page: tab === 'outgoing' ? page : 1, pageSize },
  )

  const activeQuery = tab === 'incoming' ? incomingQuery : outgoingQuery
  const data = activeQuery.data
  const allTransfers = data?.items ?? []
  const transfers = statusFilter === 'all'
    ? allTransfers
    : allTransfers.filter((t) => t.status === statusFilter)
  const total = transfers.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const localChildMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of children) map.set(c.id, c.fullName)
    return map
  }, [children])

  const unknownChildIds = useMemo(
    () => [...new Set(transfers.map((t) => t.childId).filter((id) => !localChildMap.has(id)))],
    [transfers, localChildMap],
  )
  const childQueries = useQueries({
    queries: unknownChildIds.map((id) => ({
      ...getChildrenControllerFindOneQueryOptions(id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const centersQuery = useCentersControllerFindAll({ pageSize: 100 })
  const centerNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of centersQuery.data?.items ?? []) map.set(c.id, c.name)
    return map
  }, [centersQuery.data])

  const localChildVersionMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of children) if (c.version != null) map.set(c.id, c.version)
    return map
  }, [children])

  const resolveChildName = useMemo(() => {
    const map = new Map(localChildMap)
    childQueries.forEach((q, i) => {
      if (q.data) map.set(unknownChildIds[i], (q.data as { fullName: string }).fullName)
    })
    return (id: string) => map.get(id) ?? '…'
  }, [localChildMap, childQueries, unknownChildIds])

  const resolveChildVersion = useMemo(() => {
    const map = new Map(localChildVersionMap)
    childQueries.forEach((q, i) => {
      if (q.data) map.set(unknownChildIds[i], (q.data as { version: number }).version)
    })
    return (id: string) => map.get(id) ?? 0
  }, [localChildVersionMap, childQueries, unknownChildIds])

  const resolveCenterName = (id: string) => centerNameMap.get(id) ?? '…'

  const acceptMutation = useTransfersControllerAccept()
  const cancelMutation = useTransfersControllerCancel()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: getTransfersControllerFindIncomingQueryKey() })
    void queryClient.invalidateQueries({ queryKey: getTransfersControllerFindOutgoingQueryKey() })
  }

  const handleAccept = (transfer: TransferResponseDto) => {
    acceptMutation.mutate(
      { id: transfer.id, data: { version: transfer.version, childVersion: resolveChildVersion(transfer.childId) } },
      {
        onSuccess: () => {
          showToast(caretaker.incomingTransfers.statusAccepted, 'success')
          setSelectedTransfer(null)
          invalidateAll()
        },
        onError: () => showToast('Ntibyashobotse kwakira', 'error'),
      },
    )
  }

  const handleCancel = (transfer: TransferResponseDto) => {
    cancelMutation.mutate(
      { id: transfer.id, data: { version: transfer.version, childVersion: resolveChildVersion(transfer.childId) } },
      {
        onSuccess: () => {
          showToast('Byahagaritswe', 'success')
          setSelectedTransfer(null)
          invalidateAll()
        },
        onError: () => showToast('Ntibyashobotse guhagarika', 'error'),
      },
    )
  }

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setPage(1)
    setStatusFilter(TransferStatus.pending)
  }

  const pendingIncoming = (incomingQuery.data?.items ?? []).filter(
    (t) => t.status === TransferStatus.pending,
  ).length

  return (
    <CaretakerLayout pageTitle={caretaker.nav.transfers}>
      <PageContainer>
        <PageHeader
          title={caretaker.nav.transfers}
          description={caretaker.more.transfersDesc}
          badge={pendingIncoming > 0 ? caretaker.incomingTransfers.countLabel.replace('{count}', String(pendingIncoming)) : undefined}
        />

        <PageContent className="space-y-5">
          <SegmentedTabs
            options={TAB_OPTIONS}
            value={tab}
            onChange={handleTabChange}
            aria-label={caretaker.nav.transfers}
            columns={2}
          />

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-caption font-semibold transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-background-subtle text-text-secondary hover:bg-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {activeQuery.isLoading && <TransferListSkeleton />}

          {activeQuery.isError && (
            <EmptyState
              title="Hari ikibazo"
              description="Ntibyashobotse kubona aboherejwe. Gerageza nanone."
              action={
                <Button variant="primary" onClick={() => activeQuery.refetch()}>
                  Ongera ugerageze
                </Button>
              }
            />
          )}

          {!activeQuery.isLoading && !activeQuery.isError && transfers.length === 0 && (
            <EmptyState
              icon={
                tab === 'incoming' ? (
                  <ArrowDownLeft size={32} className="text-text-muted" />
                ) : (
                  <ArrowUpRight size={32} className="text-text-muted" />
                )
              }
              title={
                tab === 'incoming'
                  ? caretaker.incomingTransfers.empty
                  : 'Nta mwana woherejwe'
              }
              description={
                tab === 'incoming'
                  ? caretaker.incomingTransfers.emptyDesc
                  : "Igihe wohereza umwana ku kindi kigo, azagaragara hano."
              }
            />
          )}

          {!activeQuery.isLoading && !activeQuery.isError && transfers.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transfers.map((transfer) => (
                  <TransferCard
                    key={transfer.id}
                    transfer={transfer}
                    direction={tab}
                    onView={setSelectedTransfer}
                    childName={resolveChildName(transfer.childId)}
                    fromCenterName={resolveCenterName(transfer.fromCenterId)}
                    toCenterName={resolveCenterName(transfer.toCenterId)}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                startIndex={(page - 1) * pageSize + 1}
                endIndex={Math.min(page * pageSize, total)}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </>
          )}
        </PageContent>
      </PageContainer>

      <TransferDetailModal
        transfer={selectedTransfer}
        direction={tab}
        onClose={() => setSelectedTransfer(null)}
        onAccept={handleAccept}
        onCancel={handleCancel}
        accepting={acceptMutation.isPending}
        cancelling={cancelMutation.isPending}
        childName={selectedTransfer ? resolveChildName(selectedTransfer.childId) : ''}
        fromCenterName={selectedTransfer ? resolveCenterName(selectedTransfer.fromCenterId) : ''}
        toCenterName={selectedTransfer ? resolveCenterName(selectedTransfer.toCenterId) : ''}
      />
    </CaretakerLayout>
  )
}
