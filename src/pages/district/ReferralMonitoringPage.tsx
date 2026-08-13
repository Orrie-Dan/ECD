import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useData } from '@/contexts/AppContext'
import { useReferralsMonitoringView } from '@/features/monitoring'
import { useDistrictReferralList } from '@/features/district'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { formatDate } from '@/lib/mock-data'
import { ECD_CENTERS } from '@/lib/mock-data'
import { buildReferralListRows, isReferralFollowUpOverdue } from '@/lib/referral-utils'
import type { Child, Referral, ReferralSourceType, ReferralStatus, StedAssessment } from '@/types'

type StatusFilter = ReferralStatus | 'all' | 'overdue'
type SourceFilter = ReferralSourceType | 'all'

export function ReferralMonitoringPage() {
  if (env.isLive) {
    return (
      <ReferralMonitoringPageShared
        children={[] as Child[]}
        referrals={[] as Referral[]}
        stedAssessments={[] as StedAssessment[]}
      />
    )
  }
  return <ReferralMonitoringPageMock />
}

function ReferralMonitoringPageMock() {
  const { children, referrals, stedAssessments } = useData()
  return (
    <ReferralMonitoringPageShared
      children={children}
      referrals={referrals}
      stedAssessments={stedAssessments}
    />
  )
}

function ReferralMonitoringPageShared({
  children,
  referrals,
  stedAssessments,
}: {
  children: Child[]
  referrals: Referral[]
  stedAssessments: StedAssessment[]
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [sector, setSector] = useState('all')
  const [listPage, setListPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data, mockSummary, mockComparisons, isLoading, isError, source, refetch } =
    useReferralsMonitoringView({
      children,
      referrals,
      stedAssessments,
    })

  /** Overdue is not a server status — map to pending for LIVE list query. */
  const liveStatus =
    statusFilter === 'all' || statusFilter === 'overdue' ? undefined : statusFilter
  const liveSource = sourceFilter === 'all' ? undefined : sourceFilter

  const liveList = useDistrictReferralList(
    {
      page: listPage,
      pageSize: 50,
      status: liveStatus,
      sourceType: liveSource,
      from: fromDate || undefined,
      to: toDate || undefined,
    },
    env.isLive,
  )

  const centers = useMemo(() => {
    if (env.isLive) {
      return (data?.items ?? []).map((row) => ({
        id: row.centerId,
        name: row.centerName,
        sector: '—',
      }))
    }
    return ECD_CENTERS.map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
    }))
  }, [data?.items])

  const centerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of centers) map.set(c.id, c.name)
    return map
  }, [centers])

  const sectors = useMemo(() => {
    if (env.isLive) return [] as string[]
    return [...new Set(centers.map((c) => c.sector))].sort()
  }, [centers])

  const summary = useMemo(() => {
    if (source === 'mock' && mockSummary) {
      return {
        open: mockSummary.open,
        completed: mockSummary.completed,
        overdueFollowUps: mockSummary.overdueFollowUps,
      }
    }
    return {
      open: data?.summary.pending ?? 0,
      completed: data?.summary.completed ?? 0,
      overdueFollowUps: data?.summary.overdue ?? 0,
    }
  }, [data?.summary, mockSummary, source])

  const comparisons = useMemo(() => {
    if (source === 'mock' && mockComparisons) {
      return mockComparisons
        .filter((row) => row.open + row.completed + row.overdueFollowUps > 0)
        .filter((row) => sector === 'all' || row.sector === sector)
        .sort(
          (a, b) => b.overdueFollowUps - a.overdueFollowUps || b.open - a.open,
        )
    }
    return (data?.items ?? [])
      .filter((row) => row.pending + row.completed + row.overdue > 0)
      .map((row) => ({
        centerId: row.centerId,
        centerName: row.centerName,
        sector: '—',
        open: row.pending,
        completed: row.completed,
        overdueFollowUps: row.overdue,
      }))
      .sort(
        (a, b) => b.overdueFollowUps - a.overdueFollowUps || b.open - a.open,
      )
  }, [data?.items, mockComparisons, sector, source])

  /** MOCK detail list — LocalStore referrals. */
  const mockListRows = useMemo(() => {
    let rows = buildReferralListRows(referrals, children, centers)
    if (sourceFilter !== 'all') {
      rows = rows.filter((r) => r.referral.sourceType === sourceFilter)
    }
    if (sector !== 'all') {
      rows = rows.filter((r) => r.sector === sector)
    }
    if (statusFilter === 'overdue') {
      rows = rows.filter((r) => r.overdue)
    } else if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.referral.status === statusFilter)
    }
    return rows
  }, [referrals, children, centers, sourceFilter, sector, statusFilter])

  /** LIVE detail list — GET /referrals. Overdue = client filter on current page only. */
  const liveListRows = useMemo(() => {
    const items = liveList.data?.items ?? []
    return items
      .map((referral) => ({
        referral,
        childName: referral.childId.slice(0, 8),
        centerName: centerNameById.get(referral.centerId) ?? referral.centerId.slice(0, 8),
        overdue: isReferralFollowUpOverdue(referral),
      }))
      .filter((row) => (statusFilter === 'overdue' ? row.overdue : true))
  }, [liveList.data?.items, centerNameById, statusFilter])

  const sourceLabel = (src: ReferralSourceType) =>
    src === 'sted' ? district.referrals.sourceSted : district.referrals.sourceNutrition

  const statusLabel = (status: ReferralStatus) => {
    if (status === 'pending') return district.referrals.open
    if (status === 'completed') return district.referrals.completed
    return district.referrals.cancelled
  }

  const statusBadgeVariant = (
    status: ReferralStatus,
    overdue: boolean,
  ): 'danger' | 'warning' | 'success' | 'neutral' => {
    if (overdue) return 'danger'
    if (status === 'pending') return 'warning'
    if (status === 'completed') return 'success'
    return 'neutral'
  }

  const onStatusChange = (value: StatusFilter) => {
    setStatusFilter(value)
    setListPage(1)
  }

  const onSourceChange = (value: SourceFilter) => {
    setSourceFilter(value)
    setListPage(1)
  }

  const onFromChange = (value: string) => {
    setFromDate(value)
    setListPage(1)
  }

  const onToChange = (value: string) => {
    setToDate(value)
    setListPage(1)
  }

  return (
    <>
      <PageContainer>
        <PageHeader title={district.referrals.title} description={district.referrals.subtitle} />
        <PageContent className="space-y-6">
          {isError ? (
            <LiveUnavailableState
              title={common.error}
              description="Ntibyashoboye kubona amakuru yo kohereza kuri API. Ongera ugerageze."
              action={
                <Button type="button" variant="primary" onClick={() => void refetch?.()}>
                  {common.reset}
                </Button>
              }
            />
          ) : isLoading ? (
            <SkeletonPage label={district.referrals.title} stats={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label={district.referrals.open}
                value={String(summary.open)}
                compact
                variant="warning"
              />
              <StatCard
                label={district.referrals.completed}
                value={String(summary.completed)}
                compact
                variant="success"
              />
              <StatCard
                label={district.referrals.overdueFollowUps}
                value={String(summary.overdueFollowUps)}
                compact
                variant={summary.overdueFollowUps > 0 ? 'warning' : 'success'}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FormField
              label={district.referrals.filterStatus}
              hint={
                env.isLive && statusFilter === 'overdue'
                  ? 'Overdue ni akayunguruzo ka client ku rupapuro rw’ubu (nta param ya API).'
                  : undefined
              }
            >
              <SelectInput
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
              >
                <option value="all">{district.referrals.allStatuses}</option>
                <option value="pending">{district.referrals.open}</option>
                <option value="completed">{district.referrals.completed}</option>
                <option value="overdue">{district.referrals.overdueFollowUps}</option>
                <option value="cancelled">{district.referrals.cancelled}</option>
              </SelectInput>
            </FormField>
            <FormField label={district.referrals.filterSource}>
              <SelectInput
                value={sourceFilter}
                onChange={(e) => onSourceChange(e.target.value as SourceFilter)}
              >
                <option value="all">{district.referrals.allSources}</option>
                <option value="nutrition">{district.referrals.sourceNutrition}</option>
                <option value="sted">{district.referrals.sourceSted}</option>
              </SelectInput>
            </FormField>
            <FormField
              label={district.growth.sector}
              hint={env.isLive ? common.live.sectorFilterUnavailable : undefined}
            >
              <SelectInput
                value={env.isLive ? 'all' : sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={env.isLive}
              >
                <option value="all">{district.referrals.allSectors}</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            {env.isLive && (
              <>
                <FormField label={district.reports.dateFrom}>
                  <TextInput
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromChange(e.target.value)}
                    aria-label={district.reports.dateFrom}
                  />
                </FormField>
                <FormField label={district.reports.dateTo}>
                  <TextInput
                    type="date"
                    value={toDate}
                    onChange={(e) => onToChange(e.target.value)}
                    aria-label={district.reports.dateTo}
                  />
                </FormField>
              </>
            )}
          </div>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">
              {district.referrals.centerComparison}
            </h2>
            {comparisons.length === 0 ? (
              <EmptyState title={district.referrals.noData} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary">
                      <th className="py-2 pr-3 font-medium">{district.growth.center}</th>
                      <th className="py-2 pr-3 font-medium">{district.growth.sector}</th>
                      <th className="py-2 pr-3 font-medium">{district.referrals.open}</th>
                      <th className="py-2 pr-3 font-medium">{district.referrals.completed}</th>
                      <th className="py-2 font-medium">{district.referrals.overdueFollowUps}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row) => (
                      <tr
                        key={row.centerId}
                        className={`border-b border-border/60 transition-colors hover:bg-background-subtle/50 ${
                          row.overdueFollowUps > 0 ? 'bg-error-light/20' : ''
                        }`}
                      >
                        <td
                          className="py-3 pr-3 text-body font-semibold"
                          data-label={district.growth.center}
                        >
                          {row.centerName}
                        </td>
                        <td className="py-3 pr-3 text-body" data-label={district.growth.sector}>
                          {row.sector}
                        </td>
                        <td className="py-3 pr-3 text-body tabular-nums" data-label={district.referrals.open}>
                          {row.open}
                        </td>
                        <td
                          className="py-3 pr-3 text-body tabular-nums"
                          data-label={district.referrals.completed}
                        >
                          {row.completed}
                        </td>
                        <td
                          className="py-3 text-body"
                          data-label={district.referrals.overdueFollowUps}
                        >
                          <Badge
                            variant={row.overdueFollowUps > 0 ? 'danger' : 'neutral'}
                            size="sm"
                          >
                            {row.overdueFollowUps}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.referrals.listTitle}</h2>
            {env.isLive ? (
              liveList.isError ? (
                <LiveUnavailableState
                  title={common.error}
                  description="Ntibyashoboye kubona urutonde rwo kohereza kuri API. Ongera ugerageze."
                  compact
                  action={
                    <Button type="button" variant="primary" onClick={() => void liveList.refetch()}>
                      {common.reset}
                    </Button>
                  }
                />
              ) : liveList.isLoading ? (
                <SkeletonPage label={district.referrals.listTitle} stats={0} />
              ) : liveListRows.length === 0 ? (
                <EmptyState title={district.referrals.noData} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-medium">{district.referrals.child}</th>
                          <th className="py-2 pr-3 font-medium">{district.growth.center}</th>
                          <th className="py-2 pr-3 font-medium">{district.referrals.source}</th>
                          <th className="py-2 pr-3 font-medium">{district.referrals.date}</th>
                          <th className="py-2 pr-3 font-medium">{district.referrals.reason}</th>
                          <th className="py-2 font-medium">{district.referrals.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveListRows.map(({ referral, childName, centerName, overdue }) => (
                          <tr
                            key={referral.id}
                            className={`border-b border-border/60 transition-colors hover:bg-background-subtle/50 ${
                              overdue ? 'bg-error-light/20' : ''
                            }`}
                          >
                            <td
                              className="py-3 pr-3 text-body font-medium"
                              data-label={district.referrals.child}
                            >
                              <Link
                                to={`/district/abana/${referral.childId}`}
                                className="text-primary hover:underline"
                              >
                                {childName}…
                              </Link>
                            </td>
                            <td
                              className="py-3 pr-3 text-body"
                              data-label={district.growth.center}
                            >
                              {centerName}
                            </td>
                            <td
                              className="py-3 pr-3 text-body"
                              data-label={district.referrals.source}
                            >
                              {sourceLabel(referral.sourceType)}
                            </td>
                            <td className="py-3 pr-3 text-body" data-label={district.referrals.date}>
                              {formatDate(referral.date)}
                            </td>
                            <td
                              className="py-3 pr-3 text-body"
                              data-label={district.referrals.reason}
                            >
                              {referral.reason}
                            </td>
                            <td className="py-3" data-label={district.referrals.status}>
                              <Badge
                                variant={statusBadgeVariant(referral.status, overdue)}
                                size="sm"
                              >
                                {overdue
                                  ? district.referrals.overdueFollowUps
                                  : statusLabel(referral.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {liveList.data && (
                    <Pagination
                      page={liveList.data.page}
                      pageSize={liveList.data.pageSize}
                      total={liveList.data.total}
                      totalPages={liveList.data.totalPages}
                      startIndex={(liveList.data.page - 1) * liveList.data.pageSize + 1}
                      endIndex={Math.min(
                        liveList.data.page * liveList.data.pageSize,
                        liveList.data.total,
                      )}
                      hasPrevious={liveList.data.page > 1}
                      hasNext={liveList.data.page < liveList.data.totalPages}
                      onPageChange={setListPage}
                      onPageSizeChange={() => undefined}
                      className="mt-4"
                    />
                  )}
                </>
              )
            ) : mockListRows.length === 0 ? (
              <EmptyState title={district.referrals.noData} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary">
                      <th className="py-2 pr-3 font-medium">{district.referrals.child}</th>
                      <th className="py-2 pr-3 font-medium">{district.growth.center}</th>
                      <th className="py-2 pr-3 font-medium">{district.referrals.source}</th>
                      <th className="py-2 pr-3 font-medium">{district.referrals.date}</th>
                      <th className="py-2 pr-3 font-medium">{district.referrals.reason}</th>
                      <th className="py-2 font-medium">{district.referrals.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockListRows.map(({ referral, childName, centerName, overdue }) => (
                      <tr
                        key={referral.id}
                        className={`border-b border-border/60 transition-colors hover:bg-background-subtle/50 ${
                          overdue ? 'bg-error-light/20' : ''
                        }`}
                      >
                        <td
                          className="py-3 pr-3 text-body font-medium"
                          data-label={district.referrals.child}
                        >
                          {childName}
                        </td>
                        <td
                          className="py-3 pr-3 text-body"
                          data-label={district.growth.center}
                        >
                          {centerName}
                        </td>
                        <td
                          className="py-3 pr-3 text-body"
                          data-label={district.referrals.source}
                        >
                          {sourceLabel(referral.sourceType)}
                        </td>
                        <td className="py-3 pr-3 text-body" data-label={district.referrals.date}>
                          {formatDate(referral.date)}
                        </td>
                        <td
                          className="py-3 pr-3 text-body"
                          data-label={district.referrals.reason}
                        >
                          {referral.reason}
                        </td>
                        <td className="py-3" data-label={district.referrals.status}>
                          <Badge
                            variant={statusBadgeVariant(referral.status, overdue)}
                            size="sm"
                          >
                            {overdue
                              ? district.referrals.overdueFollowUps
                              : statusLabel(referral.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </PageContent>
      </PageContainer>
    </>
  )
}
