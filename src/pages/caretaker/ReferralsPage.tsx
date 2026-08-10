import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { ListControlBar, type ListViewOption } from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_ROSTER_SEARCH,
  isRosterSearchActive,
  type RosterSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { Pagination } from '@/components/ui/Pagination'
import { ReferralCard } from '@/components/referrals/ReferralCard'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { applySharedChildFilters } from '@/lib/child-filters'
import {
  buildReferralFilterSummary,
  hasActiveReferralFilters,
  type ReferralListFilter,
} from '@/lib/filter-summary'
import { getTodayDate } from '@/lib/nutrition-utils'
import { isReferralFollowUpOverdue } from '@/lib/referral-utils'

export function ReferralsPage() {
  const { user } = useAuth()
  const { children, referrals, updateReferral } = useData()
  const { showSuccess, showError } = useToast()
  const [listFilter, setListFilter] = useState<ReferralListFilter>('pending')
  const [filters, setFilters] = useState<RosterSearchFilters>(DEFAULT_ROSTER_SEARCH)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const centerChildren = useMemo(
    () =>
      children.filter((c) => !user?.centerId || c.centerId === user.centerId),
    [children, user?.centerId],
  )

  const centerChildIds = useMemo(
    () => new Set(centerChildren.map((c) => c.id)),
    [centerChildren],
  )

  const childMap = useMemo(() => new Map(children.map((c) => [c.id, c])), [children])

  const scoped = useMemo(
    () =>
      referrals
        .filter((r) => centerChildIds.has(r.childId))
        .sort((a, b) => {
          const aOver = isReferralFollowUpOverdue(a)
          const bOver = isReferralFollowUpOverdue(b)
          if (aOver !== bOver) return aOver ? -1 : 1
          return b.date.localeCompare(a.date)
        }),
    [referrals, centerChildIds],
  )

  const counts = useMemo(
    () => ({
      pending: scoped.filter((r) => r.status === 'pending').length,
      completed: scoped.filter((r) => r.status === 'completed').length,
      cancelled: scoped.filter((r) => r.status === 'cancelled').length,
      overdue: scoped.filter((r) => isReferralFollowUpOverdue(r)).length,
    }),
    [scoped],
  )

  const filtered = useMemo(() => {
    const matchingChildIds = new Set(
      applySharedChildFilters(centerChildren, filters).map((c) => c.id),
    )

    let rows = scoped.filter((r) => matchingChildIds.has(r.childId))

    if (listFilter === 'overdue') {
      rows = rows.filter((r) => isReferralFollowUpOverdue(r))
    } else if (listFilter !== 'all') {
      rows = rows.filter((r) => r.status === listFilter)
    }

    if (filters.sort === 'name-desc') {
      rows = [...rows].sort((a, b) => {
        const aName = childMap.get(a.childId)?.fullName ?? ''
        const bName = childMap.get(b.childId)?.fullName ?? ''
        return bName.localeCompare(aName, 'rw')
      })
    } else if (filters.sort === 'name-asc') {
      rows = [...rows].sort((a, b) => {
        const aName = childMap.get(a.childId)?.fullName ?? ''
        const bName = childMap.get(b.childId)?.fullName ?? ''
        return aName.localeCompare(bName, 'rw')
      })
    } else if (filters.sort === 'recent-first') {
      rows = [...rows].sort((a, b) => b.date.localeCompare(a.date))
    }

    return rows
  }, [scoped, centerChildren, filters, listFilter, childMap])

  const pagination = usePagination(filtered, {
    resetDeps: [listFilter, filters, filtered.length],
  })

  const filterSummary = useMemo(
    () => buildReferralFilterSummary(filters, listFilter),
    [filters, listFilter],
  )

  const hasActiveConfig = hasActiveReferralFilters(filters, listFilter)

  const viewOptions: ListViewOption[] = [
    { value: 'overdue', label: caretaker.referral.overdue },
    { value: 'pending', label: caretaker.referral.pending },
    { value: 'completed', label: caretaker.referral.completed },
    { value: 'cancelled', label: caretaker.referral.cancelled },
    { value: 'all', label: caretaker.referral.all },
  ]

  const resetAll = () => {
    setFilters(DEFAULT_ROSTER_SEARCH)
    setListFilter('pending')
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={caretaker.referral.followUpTitle}
          description={caretaker.referral.subtitle}
        />
        <PageContent className="space-y-6">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-stretch"
            role="group"
            aria-label={caretaker.referral.followUpTitle}
          >
            <div className="h-full [&>button]:h-full [&>div]:h-full">
              <StatCard
                label={caretaker.referral.overdueCount}
                value={counts.overdue}
                variant={counts.overdue > 0 ? 'danger' : 'default'}
                compact
                selected={listFilter === 'overdue'}
                onClick={() => setListFilter('overdue')}
              />
            </div>
            <div className="h-full [&>button]:h-full [&>div]:h-full">
              <StatCard
                label={caretaker.referral.pendingCount}
                value={counts.pending}
                variant="warning"
                compact
                selected={listFilter === 'pending'}
                onClick={() => setListFilter('pending')}
              />
            </div>
            <div className="h-full [&>button]:h-full [&>div]:h-full col-span-2 sm:col-span-1">
              <StatCard
                label={caretaker.referral.completedCount}
                value={counts.completed}
                variant="success"
                compact
                selected={listFilter === 'completed'}
                onClick={() => setListFilter('completed')}
              />
            </div>
          </div>

          <section>
            <ListControlBar
              childName={filters.childName}
              onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
              viewState={listFilter}
              onViewStateChange={(state) => setListFilter(state as ReferralListFilter)}
              viewOptions={viewOptions}
              onOpenSearchFilters={() => setDrawerOpen(true)}
              hasActiveSearchFilters={isRosterSearchActive(filters)}
            />

            {scoped.length > 0 && (
              <FilterResultsBar
                count={filtered.length}
                summary={hasActiveConfig ? filterSummary : null}
                onClear={resetAll}
                showClear={hasActiveConfig}
              />
            )}

            {pagination.items.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={caretaker.referral.noReferrals}
                action={
                  hasActiveConfig ? (
                    <Button variant="tertiary" size="md" onClick={resetAll}>
                      {caretaker.children.resetFilters}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="space-y-3">
                  {pagination.items.map((referral) => (
                    <ReferralCard
                      key={referral.id}
                      referral={referral}
                      child={childMap.get(referral.childId)}
                      onMarkImplemented={() => {
                        void updateReferral(referral.id, { implementedAt: getTodayDate() })
                          .then(() => showSuccess(common.sync.savedOnDevice))
                          .catch((err) => showError(messageForMutationFailure(err)))
                      }}
                      onCompleteFollowUp={(notes) => {
                        void updateReferral(referral.id, {
                          status: 'completed',
                          implementedAt: referral.implementedAt ?? getTodayDate(),
                          notes: notes ?? referral.notes,
                        })
                          .then(() => showSuccess(common.sync.savedOnDevice))
                          .catch((err) => showError(messageForMutationFailure(err)))
                      }}
                      onSaveNotes={(notes) => {
                        void updateReferral(referral.id, { notes })
                          .then(() => showSuccess(common.sync.savedOnDevice))
                          .catch((err) => showError(messageForMutationFailure(err)))
                      }}
                    />
                  ))}
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
                  pageSizeSelectId="referral-list-page-size"
                />
              </>
            )}
          </section>

          <SearchFiltersPanel
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            variant="roster"
            filters={filters}
            onApply={(next) => setFilters(next as RosterSearchFilters)}
          />
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
