import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Accessibility, Eye, History } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { ListControlBar, type ListViewOption } from '@/components/ui/ListControlBar'
import {
  SearchFiltersPanel,
  DEFAULT_ROSTER_SEARCH,
  type RosterSearchFilters,
} from '@/components/ui/SearchFiltersPanel'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { Pagination } from '@/components/ui/Pagination'
import { StedAssessmentViewSheet } from '@/components/sted/StedAssessmentViewSheet'
import { useAuth, useData } from '@/contexts/AppContext'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import { applySharedChildFilters, isRosterSearchActive } from '@/lib/child-filters'
import type { Child, StedAssessment } from '@/types'

type HistoryFilter = 'all' | 'normal'

function outcomeLabel(assessment: StedAssessment): string {
  if (assessment.outcome.referred) return caretaker.sted.outcomeReferred
  if (assessment.outcome.normal) return caretaker.sted.outcomeNormal
  if (assessment.outcome.counseling) return caretaker.sted.outcomeCounseling
  return caretaker.sted.outcomeOther
}

function outcomeBadgeVariant(
  assessment: StedAssessment,
): 'success' | 'warning' | 'neutral' {
  if (assessment.outcome.referred) return 'warning'
  if (assessment.outcome.normal) return 'success'
  return 'neutral'
}

export function StedHistoryPage() {
  const { user } = useAuth()
  const { children, stedAssessments } = useData()
  const [listFilter, setListFilter] = useState<HistoryFilter>('all')
  const [filters, setFilters] = useState<RosterSearchFilters>(DEFAULT_ROSTER_SEARCH)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewing, setViewing] = useState<{
    child: Child
    assessment: StedAssessment
  } | null>(null)

  const centerChildren = useMemo(
    () =>
      children.filter(
        (c) =>
          c.status === 'active' &&
          (!user?.centerId || c.centerId === user.centerId),
      ),
    [children, user?.centerId],
  )

  const matchingChildIds = useMemo(
    () => new Set(applySharedChildFilters(centerChildren, filters).map((c) => c.id)),
    [centerChildren, filters],
  )

  const rows = useMemo(() => {
    let result = [...stedAssessments]
      .filter((a) => !user?.centerId || a.centerId === user.centerId)
      .map((assessment) => ({
        assessment,
        child: children.find((c) => c.id === assessment.childId),
      }))
      .filter(({ assessment, child }) => {
        if (!matchingChildIds.has(assessment.childId)) return false
        if (listFilter === 'normal' && !assessment.outcome.normal) return false
        if (filters.childName.trim() && !child) return false
        return true
      })

    if (filters.sort === 'name-asc') {
      result = [...result].sort((a, b) =>
        (a.child?.fullName ?? '').localeCompare(b.child?.fullName ?? '', 'rw'),
      )
    } else if (filters.sort === 'name-desc') {
      result = [...result].sort((a, b) =>
        (b.child?.fullName ?? '').localeCompare(a.child?.fullName ?? '', 'rw'),
      )
    } else {
      result = [...result].sort((a, b) =>
        b.assessment.assessmentDate.localeCompare(a.assessment.assessmentDate),
      )
    }

    return result
  }, [
    stedAssessments,
    children,
    user?.centerId,
    listFilter,
    matchingChildIds,
    filters.childName,
    filters.sort,
  ])

  const pagination = usePagination(rows, {
    resetDeps: [listFilter, filters, rows.length],
  })

  const hasActiveConfig = isRosterSearchActive(filters) || listFilter !== 'all'

  const viewOptions: ListViewOption[] = [
    { value: 'all', label: caretaker.sted.filterAll },
    { value: 'normal', label: caretaker.sted.filterNormal },
  ]

  const resetAll = () => {
    setFilters(DEFAULT_ROSTER_SEARCH)
    setListFilter('all')
  }

  return (
    <CaretakerLayout backTo="/caretaker/sted" backLabel={caretaker.nav.sted}>
      <PageContainer>
        <PageHeader
          title={caretaker.sted.historyTitle}
          description={caretaker.sted.historySubtitle}
          action={
            <Link to="/caretaker/sted/new" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                icon={<Accessibility size={18} />}
                className="w-full sm:w-auto"
              >
                {caretaker.sted.startAssessment}
              </Button>
            </Link>
          }
        />

        <PageContent className="space-y-6">
          <section>
            <h2 className="text-subheading text-text mb-3">
              {caretaker.sted.previousAssessments}
            </h2>

            <ListControlBar
              childName={filters.childName}
              onChildNameChange={(childName) => setFilters((prev) => ({ ...prev, childName }))}
              viewState={listFilter}
              onViewStateChange={(state) => setListFilter(state as HistoryFilter)}
              viewOptions={viewOptions}
              onOpenSearchFilters={() => setDrawerOpen(true)}
              hasActiveSearchFilters={isRosterSearchActive(filters)}
            />

            <FilterResultsBar
              count={rows.length}
              summary={
                hasActiveConfig
                  ? `Urimo kubona isuzuma ${rows.length}.`
                  : null
              }
              onClear={resetAll}
              showClear={hasActiveConfig}
            />

            {rows.length === 0 ? (
              <EmptyState
                icon={<History size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={caretaker.sted.noAssessments}
                action={
                  hasActiveConfig ? (
                    <Button variant="tertiary" size="md" onClick={resetAll}>
                      {caretaker.children.resetFilters}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Card padding="lg">
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.sted.selectChild}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.sted.assessmentDate}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.sted.ageBand}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.sted.stepOutcome}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.sted.nextFollowUp}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {caretaker.children.viewDetails}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.items.map(({ assessment, child }, index) => {
                        const isLatest = index === 0 && pagination.page === 1
                        return (
                          <tr
                            key={assessment.id}
                            className={`border-b border-border last:border-0 transition-colors hover:bg-background-subtle/60 ${
                              isLatest ? 'bg-primary-light/30' : ''
                            }`}
                          >
                            <td
                              className="py-3 pr-4 text-body font-semibold text-text"
                              data-label={caretaker.sted.selectChild}
                            >
                              <span className="inline-flex flex-wrap items-center gap-2">
                                {child?.fullName ?? assessment.childId}
                                {isLatest && (
                                  <Badge variant="primary" size="sm">
                                    {caretaker.growth.latestMeasurement}
                                  </Badge>
                                )}
                              </span>
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={caretaker.sted.assessmentDate}
                            >
                              {formatDate(assessment.assessmentDate)}
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={caretaker.sted.ageBand}
                            >
                              {assessment.ageBand === '1_3'
                                ? caretaker.sted.ageBand1_3
                                : caretaker.sted.ageBand4_6}
                            </td>
                            <td className="py-3 pr-4" data-label={caretaker.sted.stepOutcome}>
                              <Badge variant={outcomeBadgeVariant(assessment)} size="sm">
                                {outcomeLabel(assessment)}
                              </Badge>
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={caretaker.sted.nextFollowUp}
                            >
                              {assessment.outcome.followUpDueDate
                                ? formatDate(assessment.outcome.followUpDueDate)
                                : '—'}
                            </td>
                            <td className="py-3" data-label={caretaker.children.viewDetails}>
                              <Button
                                variant="tertiary"
                                size="sm"
                                icon={<Eye size={16} />}
                                disabled={!child}
                                onClick={() => {
                                  if (!child) return
                                  setViewing({ child, assessment })
                                }}
                                aria-label={`${caretaker.sted.viewAssessment}: ${child?.fullName ?? assessment.childId}`}
                              >
                                {caretaker.sted.viewAssessment}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
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
                  pageSizeSelectId="sted-history-page-size"
                />
              </Card>
            )}
          </section>

          <StedAssessmentViewSheet
            open={!!viewing}
            child={viewing?.child ?? null}
            assessment={viewing?.assessment ?? null}
            onClose={() => setViewing(null)}
          />

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
