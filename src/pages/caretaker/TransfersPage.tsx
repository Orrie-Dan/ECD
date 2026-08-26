import { useState, useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
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
import { formatApiErrorMessage, normalizeApiError } from '@/api/errors'
import {
  useTransfersControllerAccept,
  useTransfersControllerCancel,
} from '@/api/generated/endpoints/transfers/transfers'
import type { TransferResponseDto } from '@/api/generated/models'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import { TransferDetailModal } from '@/components/transfers/TransferDetailModal'
import { useCentersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import { useAuth, useData } from '@/contexts/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { isEcdDirector } from '@/api/roles'
import { transfers } from '@/api/query-keys'
import { invalidateChildrenQueries } from '@/features/children/mutations'
import {
  refreshChildFromApiLocal,
  revertChildPendingTransferLocal,
} from '@/features/children/transfer-local'
import { useCenterTransferHistory } from '@/features/transfers'
import { useReconcileOutgoingTransfers } from '@/hooks/useReconcileOutgoingTransfers'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'

/**
 * Incoming / historical transfers often reference children outside the caller's
 * center scope. Never GET /children/:id for those — it 404s by design.
 * Prefer local centre children, then optional DTO enrichment if the API adds it.
 */
function readTransferChildMeta(transfer: TransferResponseDto): {
  name?: string
  version?: number
} {
  const raw = transfer as TransferResponseDto & {
    childName?: unknown
    childFullName?: unknown
    childVersion?: unknown
  }
  const nameCandidate =
    (typeof raw.childName === 'string' && raw.childName.trim()) ||
    (typeof raw.childFullName === 'string' && raw.childFullName.trim()) ||
    ''
  const version = typeof raw.childVersion === 'number' ? raw.childVersion : undefined
  return {
    name: nameCandidate || undefined,
    version,
  }
}

function conflictRetryVersions(
  error: unknown,
  attempted: { version: number; childVersion: number },
): { version: number; childVersion: number } | null {
  const apiError = normalizeApiError(error)
  if (!apiError.isConflict) return null
  const raw = apiError.raw
  if (!raw || typeof raw !== 'object') return null
  const body = raw as { entity?: unknown; currentVersion?: unknown }
  if (typeof body.currentVersion !== 'number') return null
  const entity = String(body.entity ?? '').toLowerCase()
  if (entity.includes('child')) {
    return { version: attempted.version, childVersion: body.currentVersion }
  }
  if (entity.includes('transfer')) {
    return { version: body.currentVersion, childVersion: attempted.childVersion }
  }
  return null
}

type Tab = 'incoming' | 'outgoing'

const TAB_OPTIONS = [
  { id: 'incoming' as const, label: caretaker.incomingTransfers.title },
  { id: 'outgoing' as const, label: caretaker.incomingTransfers.outgoingTitle },
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
  { value: 'all', label: 'Byose' },
  { value: TransferStatus.pending, label: caretaker.incomingTransfers.statusPending },
  { value: TransferStatus.accepted, label: caretaker.incomingTransfers.statusAccepted },
  { value: TransferStatus.cancelled, label: 'Byahagaritswe' },
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

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-caption text-primary font-semibold">
            {isPending && direction === 'incoming'
              ? caretaker.incomingTransfers.accept
              : caretaker.incomingTransfers.viewDetails}
            {' →'}
          </p>
        </div>
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
  const [statusFilter, setStatusFilter] = useState<'all' | TransferStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferResponseDto | null>(null)
  const { showToast } = useToast()
  useReconcileOutgoingTransfers()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { children } = useData()
  const canUseTransfers = env.isLive && isEcdDirector(user) && Boolean(user?.centerId)

  const historyFilters = useMemo(
    () => ({
      page,
      pageSize,
      direction: tab,
      ...(statusFilter === 'all' ? {} : { status: statusFilter }),
    }),
    [page, pageSize, tab, statusFilter],
  )

  const historyQuery = useCenterTransferHistory(
    user?.centerId,
    historyFilters,
    canUseTransfers,
  )

  const pendingIncomingQuery = useCenterTransferHistory(
    user?.centerId,
    {
      page: 1,
      pageSize: 1,
      direction: 'incoming',
      status: TransferStatus.pending,
    },
    canUseTransfers,
  )

  const transfersList = historyQuery.data?.items ?? []
  const total = historyQuery.data?.total ?? 0
  const totalPages =
    historyQuery.data?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize)))

  const localChildMap = useMemo(() => {
    const map = new Map<string, { name: string; version?: number }>()
    for (const c of children) {
      map.set(c.id, { name: c.fullName, version: c.version })
    }
    return map
  }, [children])

  const centersQuery = useCentersControllerFindAll({ pageSize: 100 })
  const centerNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of centersQuery.data?.items ?? []) map.set(c.id, c.name)
    return map
  }, [centersQuery.data])

  const resolveChildName = (transfer: TransferResponseDto) => {
    const local = localChildMap.get(transfer.childId)?.name
    if (local) return local
    return readTransferChildMeta(transfer).name ?? caretaker.incomingTransfers.unknownChild
  }

  const resolveChildVersion = (transfer: TransferResponseDto): number => {
    const local = localChildMap.get(transfer.childId)?.version
    if (local != null) return local
    return readTransferChildMeta(transfer).version ?? 0
  }

  const resolveCenterName = (id: string) => centerNameMap.get(id) ?? '…'

  const acceptMutation = useTransfersControllerAccept()
  const cancelMutation = useTransfersControllerCancel()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: transfers.keys.all })
  }

  const refreshChildAfterTransfer = async (childId: string, kind: 'accept' | 'cancel') => {
    if (!env.isLive) {
      await invalidateChildrenQueries(queryClient, childId)
      return
    }
    const store = getLocalStore()
    if (kind === 'cancel') {
      await revertChildPendingTransferLocal(store, childId)
    }
    try {
      await refreshChildFromApiLocal(store, childId)
    } catch {
      // Offline or out of scope — local pending/cancel patch still applied.
    }
    await invalidateChildrenQueries(queryClient, childId)
    void getSyncEngine().syncNow()
  }

  const runTransferMutation = async (
    kind: 'accept' | 'cancel',
    transfer: TransferResponseDto,
  ) => {
    const mutateAsync =
      kind === 'accept' ? acceptMutation.mutateAsync : cancelMutation.mutateAsync
    const successMessage =
      kind === 'accept' ? caretaker.incomingTransfers.statusAccepted : 'Byahagaritswe'

    let data = {
      version: transfer.version,
      childVersion: resolveChildVersion(transfer),
    }

    try {
      await mutateAsync({ id: transfer.id, data })
      showToast(successMessage, 'success')
      setSelectedTransfer(null)
      invalidateAll()
      await refreshChildAfterTransfer(transfer.childId, kind)
    } catch (err) {
      const retry = conflictRetryVersions(err, data)
      if (retry) {
        try {
          data = retry
          await mutateAsync({ id: transfer.id, data })
          showToast(successMessage, 'success')
          setSelectedTransfer(null)
          invalidateAll()
          await refreshChildAfterTransfer(transfer.childId, kind)
          return
        } catch (retryErr) {
          showToast(formatApiErrorMessage(retryErr), 'error')
          setSelectedTransfer(null)
          invalidateAll()
          return
        }
      }
      showToast(formatApiErrorMessage(err), 'error')
      setSelectedTransfer(null)
      invalidateAll()
    }
  }

  const handleAccept = (transfer: TransferResponseDto) => {
    void runTransferMutation('accept', transfer)
  }

  const handleCancel = (transfer: TransferResponseDto) => {
    void runTransferMutation('cancel', transfer)
  }

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setPage(1)
    setStatusFilter('all')
  }

  const pendingIncoming = pendingIncomingQuery.data?.total ?? 0

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
                    ? 'bg-primary !text-white shadow-sm [&_*]:!text-white'
                    : 'bg-background-subtle text-text-secondary hover:bg-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {historyQuery.isLoading && <TransferListSkeleton />}

          {historyQuery.isError && (
            <EmptyState
              title="Hari ikibazo"
              description="Ntibyashobotse kubona amateka yo kwimura. Gerageza nanone."
              action={
                <Button variant="primary" onClick={() => void historyQuery.refetch()}>
                  Ongera ugerageze
                </Button>
              }
            />
          )}

          {!historyQuery.isLoading && !historyQuery.isError && transfersList.length === 0 && (
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
                  ? caretaker.incomingTransfers.emptyHistory
                  : caretaker.incomingTransfers.emptyOutgoingHistory
              }
              description={
                tab === 'incoming'
                  ? caretaker.incomingTransfers.emptyHistoryDesc
                  : caretaker.incomingTransfers.emptyOutgoingHistoryDesc
              }
            />
          )}

          {!historyQuery.isLoading && !historyQuery.isError && transfersList.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transfersList.map((transfer) => (
                  <TransferCard
                    key={transfer.id}
                    transfer={transfer}
                    direction={transfer.direction ?? tab}
                    onView={setSelectedTransfer}
                    childName={resolveChildName(transfer)}
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
                startIndex={total === 0 ? 0 : (page - 1) * pageSize + 1}
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
        childName={selectedTransfer ? resolveChildName(selectedTransfer) : ''}
        fromCenterName={selectedTransfer ? resolveCenterName(selectedTransfer.fromCenterId) : ''}
        toCenterName={selectedTransfer ? resolveCenterName(selectedTransfer.toCenterId) : ''}
      />
    </CaretakerLayout>
  )
}
