import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Eye, Check } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { AcceptTransferDialog } from '@/components/children/AcceptTransferDialog'
import { TransferDetailsDialog } from '@/components/children/TransferDetailsDialog'
import { useAuth, useData } from '@/contexts/AppContext'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/lib/mock-data'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type { Child } from '@/types'

function TransfersSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-background-subtle animate-pulse" />
      ))}
    </div>
  )
}

export function TransfersPage() {
  const { user } = useAuth()
  const { getIncomingTransfers } = useData()
  const centerId = resolveCenterId(user?.centerId)

  const [isLoading, setIsLoading] = useState(true)
  const [acceptChild, setAcceptChild] = useState<Child | null>(null)
  const [detailsChild, setDetailsChild] = useState<Child | null>(null)

  const incoming = useMemo(
    () =>
      centerId
        ? [...getIncomingTransfers(centerId)].sort((a, b) =>
            (b.transferredAt ?? '').localeCompare(a.transferredAt ?? ''),
          )
        : [],
    [getIncomingTransfers, centerId],
  )

  useEffect(() => {
    setIsLoading(true)
    const timer = window.setTimeout(() => setIsLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [incoming.length])

  const pagination = usePagination(incoming, {
    resetDeps: [incoming.length, centerId],
  })

  const countLabel = caretaker.incomingTransfers.countLabel.replace(
    '{count}',
    String(incoming.length),
  )

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={caretaker.incomingTransfers.title}
          description={
            <>
              {caretaker.incomingTransfers.subtitle}
              {!isLoading && incoming.length > 0 && (
                <span className="mt-2 block text-caption font-semibold text-primary">
                  {countLabel}
                </span>
              )}
            </>
          }
        />
        <PageContent>
          {!centerId ? (
            <LiveUnavailableState
              title={common.live.missingCenterId}
              description={common.live.unavailableDesc}
            />
          ) : isLoading ? (
            <TransfersSkeleton label={caretaker.incomingTransfers.loading} />
          ) : incoming.length === 0 ? (
            <EmptyState
              icon={<ArrowRightLeft size={48} className="text-text-muted" strokeWidth={1.5} />}
              title={caretaker.incomingTransfers.empty}
              description={caretaker.incomingTransfers.emptyDesc}
            />
          ) : (
            <Card padding="lg">
              <h3 className="text-subheading text-text mb-5">
                {caretaker.incomingTransfers.listTitle}
              </h3>
              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full min-w-0 text-left responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {caretaker.incomingTransfers.childName}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {caretaker.incomingTransfers.sourceCenter}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {caretaker.incomingTransfers.transferDate}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {caretaker.incomingTransfers.status}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3">
                        {common.labels.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.items.map((child) => (
                      <tr
                        key={child.id}
                        className="border-b border-border last:border-0 hover:bg-background-subtle/60"
                      >
                        <td
                          className="py-3 pr-4 text-body font-medium text-text"
                          data-label={caretaker.incomingTransfers.childName}
                        >
                          {child.fullName}
                        </td>
                        <td
                          className="py-3 pr-4 text-body text-text-secondary"
                          data-label={caretaker.incomingTransfers.sourceCenter}
                        >
                          {child.centerName}
                        </td>
                        <td
                          className="py-3 pr-4 text-body text-text-secondary"
                          data-label={caretaker.incomingTransfers.transferDate}
                        >
                          {child.transferredAt ? formatDate(child.transferredAt) : '—'}
                        </td>
                        <td
                          className="py-3 pr-4"
                          data-label={caretaker.incomingTransfers.status}
                        >
                          <Badge variant="warning" size="sm">
                            {caretaker.incomingTransfers.statusPending}
                          </Badge>
                        </td>
                        <td className="py-3 td-actions" data-label="">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="tertiary"
                              size="sm"
                              icon={<Eye size={16} />}
                              onClick={() => setDetailsChild(child)}
                            >
                              {caretaker.incomingTransfers.viewDetails}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Check size={16} />}
                              onClick={() => setAcceptChild(child)}
                            >
                              {caretaker.incomingTransfers.accept}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                pageSizeSelectId="transfers-page-size"
              />
            </Card>
          )}

          {detailsChild && (
            <TransferDetailsDialog
              open={!!detailsChild}
              onClose={() => setDetailsChild(null)}
              child={detailsChild}
              onAccept={() => setAcceptChild(detailsChild)}
            />
          )}
          {acceptChild && (
            <AcceptTransferDialog
              open={!!acceptChild}
              onClose={() => setAcceptChild(null)}
              child={acceptChild}
            />
          )}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
