import { useMemo, useState } from 'react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { DISTRICT_MONITORING_TABS } from '@/layouts/district/navigation'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useData } from '@/contexts/AppContext'
import { roundPct, useFeedingMonitoringView } from '@/features/monitoring'
import { useMonitoringCentre } from '@/features/district/monitoring/useMonitoringCentre'
import { EnhancedBarChart, formatPercentTick, PERCENT_DOMAIN } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { getCurrentYearMonth, daysInYearMonth, type CenterFeedingComparison } from '@/lib/feeding-utils'
import { ECD_CENTERS } from '@/lib/mock-data'
import { env } from '@/config/env'
import type { CenterFeedingDay, CenterFeedingMonthSummary } from '@/types'

function mockFeedingCoverage(row: CenterFeedingComparison, yearMonth: string): number {
  const days = daysInYearMonth(yearMonth)
  if (days <= 0) return 0
  const recorded = Math.max(row.milkDays, row.porridgeDays, row.balancedDays)
  return Math.round((recorded / days) * 100)
}

export function FeedingMonitoringPage() {
  if (env.isLive) {
    return (
      <FeedingMonitoringPageShared
        feedingDays={[] as CenterFeedingDay[]}
        feedingSummaries={[] as CenterFeedingMonthSummary[]}
      />
    )
  }
  return <FeedingMonitoringPageMock />
}

function FeedingMonitoringPageMock() {
  const { feedingDays, feedingSummaries } = useData()
  return <FeedingMonitoringPageShared feedingDays={feedingDays} feedingSummaries={feedingSummaries} />
}

function FeedingMonitoringPageShared({
  feedingDays,
  feedingSummaries,
}: {
  feedingDays: CenterFeedingDay[]
  feedingSummaries: CenterFeedingMonthSummary[]
}) {
  const { centreId: scopedCentreId, setCentreId: setScopedCentreId } = useMonitoringCentre()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [search, setSearch] = useState('')

  const { data, mockComparisons, mockSummary, isLoading, isError, source, refetch } =
    useFeedingMonitoringView({
    yearMonth,
    feedingDays,
    feedingSummaries,
    centerId: scopedCentreId ?? undefined,
  })

  const summaryCards = useMemo(() => {
    if (source === 'mock' && mockSummary) {
      return {
        centersReporting: mockSummary.centersReporting,
        totalCenters: mockSummary.totalCenters,
        daysRecorded: mockSummary.avgMilkDays + mockSummary.avgBalancedDays,
        avgMilkDays: mockSummary.avgMilkDays,
        avgBalancedDays: mockSummary.avgBalancedDays,
      }
    }
    const s = data?.summary
    if (!s) {
      return {
        centersReporting: 0,
        totalCenters: 0,
        daysRecorded: 0,
        avgMilkDays: 0,
        avgBalancedDays: 0,
      }
    }
    return {
      centersReporting: s.reportingCenters,
      totalCenters: s.centersInScope,
      daysRecorded: s.daysRecorded,
      avgMilkDays: s.daysWithMilk,
      avgBalancedDays: s.daysWithBalancedMeal,
    }
  }, [data?.summary, mockSummary, source])

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (source === 'mock' && mockComparisons) {
      const rows = mockComparisons
      if (!q) return rows.map((r) => ({ kind: 'mock' as const, row: r }))
      return rows
        .filter(
          (row) =>
            row.centerName.toLowerCase().includes(q) || row.sector.toLowerCase().includes(q),
        )
        .map((r) => ({ kind: 'mock' as const, row: r }))
    }
    const items = data?.items ?? []
    const scoped = scopedCentreId
      ? items.filter((row) => row.centerId === scopedCentreId)
      : items
    const filtered = q
      ? scoped.filter((row) => row.centerName.toLowerCase().includes(q))
      : scoped
    return filtered.map((r) => ({ kind: 'api' as const, row: r }))
  }, [data?.items, mockComparisons, scopedCentreId, search, source])

  const coverageChartRows = useMemo(
    () =>
      tableRows
        .map((entry) => {
          const rate =
            entry.kind === 'mock' ? mockFeedingCoverage(entry.row, yearMonth) : roundPct(entry.row.coverage)
          return { name: entry.row.centerName, rate }
        })
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 12),
    [tableRows, yearMonth],
  )

  const centerOptions = useMemo(() => {
    if (env.isLive) {
      const opts = (data?.items ?? []).map((row) => ({ id: row.centerId, name: row.centerName }))
      if (scopedCentreId && !opts.some((o) => o.id === scopedCentreId)) {
        return [{ id: scopedCentreId, name: scopedCentreId }, ...opts]
      }
      return opts
    }
    return ECD_CENTERS.map((c) => ({ id: c.id, name: c.name }))
  }, [data?.items, scopedCentreId])

  return (
    <>
      <PageContainer>
        <PageHeader title={district.imirire.title} description={district.imirire.subtitle} />
        <DistrictWorkspaceNav
          items={DISTRICT_MONITORING_TABS}
          ariaLabel={district.monitoringHub.title}
        />
        <PageContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label={district.imirire.selectMonth}>
              <TextInput
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="!min-h-11 sm:!min-h-12"
              />
            </FormField>
            <FormField label={district.growth.center}>
              <SelectInput
                value={scopedCentreId ?? 'all'}
                onChange={(e) => setScopedCentreId(e.target.value)}
                aria-label={district.growth.center}
                className="!min-h-11 sm:!min-h-12 text-body font-semibold"
              >
                <option value="all">{district.growth.centerAll}</option>
                {centerOptions.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label={district.imirire.searchCenter}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={district.imirire.searchCenter}
              />
            </FormField>
          </div>

          {isLoading ? (
            <SkeletonPage label={district.imirire.title} stats={4} />
          ) : isError ? (
            <LiveUnavailableState
              title={common.error}
              description="Ntibyashoboye kubona amakuru y'imirire kuri API. Ongera ugerageze."
              action={
                <Button type="button" variant="primary" onClick={() => void refetch?.()}>
                  {common.reset}
                </Button>
              }
            />
          ) : (
            <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.imirire.centersReporting}
                value={`${summaryCards.centersReporting}/${summaryCards.totalCenters}`}
                variant={
                  summaryCards.centersReporting === summaryCards.totalCenters
                    ? 'success'
                    : 'warning'
                }
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.imirire.daysRecorded}
                value={String(summaryCards.daysRecorded)}
                variant="success"
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.imirire.avgMilkDays}
                value={String(summaryCards.avgMilkDays)}
                variant="info"
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.imirire.avgBalancedDays}
                value={String(summaryCards.avgBalancedDays)}
                variant="success"
                compact
              />
            </div>
          </div>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.imirire.chartTitle}</h2>
            {tableRows.length === 0 ? (
              <EmptyState title={district.imirire.noData} />
            ) : (
              <EnhancedBarChart
                data={coverageChartRows}
                layout="vertical"
                height={Math.max(260, Math.min(coverageChartRows.length, 12) * 32 + 56)}
                series={[
                  {
                    dataKey: 'rate',
                    label: district.monitoringHub.coverage,
                    color: CHART_METRIC_COLORS.feedingBalanced,
                    valueFormatter: formatPercentTick,
                  },
                ]}
                valueDomain={PERCENT_DOMAIN}
                showValueLabels
                valueLabelFormatter={formatPercentTick}
                ariaLabel={district.imirire.chartTitle}
                xAxisLabel={district.charts.axisPercent}
                yAxisLabel={district.charts.axisCenter}
                yTickFormatter={formatPercentTick}
              />
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.imirire.centerComparison}</h2>
            {tableRows.length === 0 ? (
              <EmptyState title={district.imirire.noData} />
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full min-w-0 text-left responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.growth.center}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.growth.sector}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.reportingStatus}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.milkDays}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.porridgeDays}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.balancedDays}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.liters}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.imirire.flour}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3">
                        {district.imirire.foodSource}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((entry) => {
                      if (entry.kind === 'mock') {
                        const row = entry.row
                        const reporting =
                          row.milkDays + row.porridgeDays + row.balancedDays > 0 ||
                          row.hasSummary
                        return (
                          <tr
                            key={row.centerId}
                            className={`border-b border-border last:border-0 transition-colors hover:bg-background-subtle/60 ${
                              !reporting ? 'bg-warning-light/15' : ''
                            }`}
                          >
                            <td className="py-3 pr-4 text-body font-medium" data-label={district.growth.center}>
                              {row.centerName}
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.growth.sector}>
                              {row.sector}
                            </td>
                            <td className="py-3 pr-4" data-label={district.imirire.reportingStatus}>
                              <Badge variant={reporting ? 'success' : 'warning'} size="sm">
                                {reporting
                                  ? district.imirire.statusReported
                                  : district.imirire.statusMissing}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.imirire.milkDays}>
                              {row.milkDays}
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.imirire.porridgeDays}>
                              {row.porridgeDays}
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.imirire.balancedDays}>
                              {row.balancedDays}
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.imirire.liters}>
                              {row.milkLiters}
                            </td>
                            <td className="py-3 pr-4 text-body" data-label={district.imirire.flour}>
                              {row.flourKg}
                            </td>
                            <td className="py-3 text-body" data-label={district.imirire.foodSource}>
                              {row.foodSource || '—'}
                            </td>
                          </tr>
                        )
                      }

                      const row = entry.row
                      const reporting = row.daysRecorded > 0
                      return (
                        <tr
                          key={row.centerId}
                          className={`border-b border-border last:border-0 transition-colors hover:bg-background-subtle/60 ${
                            !reporting ? 'bg-warning-light/15' : ''
                          }`}
                        >
                          <td className="py-3 pr-4 text-body font-medium" data-label={district.growth.center}>
                            {row.centerName}
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.growth.sector}>
                            —
                          </td>
                          <td className="py-3 pr-4" data-label={district.imirire.reportingStatus}>
                            <Badge variant={reporting ? 'success' : 'warning'} size="sm">
                              {reporting
                                ? district.imirire.statusReported
                                : district.imirire.statusMissing}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.imirire.milkDays}>
                            —
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.imirire.porridgeDays}>
                            —
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.imirire.balancedDays}>
                            {row.daysRecorded}
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.imirire.liters}>
                            —
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.imirire.flour}>
                            —
                          </td>
                          <td className="py-3 text-body" data-label={district.imirire.foodSource}>
                            —
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
            </>
          )}
        </PageContent>
      </PageContainer>
    </>
  )
}
