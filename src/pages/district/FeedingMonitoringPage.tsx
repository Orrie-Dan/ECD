import { useMemo, useState } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FormField, TextInput } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { useData } from '@/contexts/AppContext'
import { useFeedingMonitoringView, roundPct } from '@/features/monitoring'
import { district } from '@/locales/rw/district'
import { getCurrentYearMonth } from '@/lib/feeding-utils'

export function FeedingMonitoringPage() {
  const { feedingDays, feedingSummaries } = useData()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [search, setSearch] = useState('')

  const { data, mockComparisons, mockSummary, isLoading, source } = useFeedingMonitoringView({
    yearMonth,
    feedingDays,
    feedingSummaries,
  })

  const summaryCards = useMemo(() => {
    if (source === 'mock' && mockSummary) {
      return {
        centersReporting: mockSummary.centersReporting,
        totalCenters: mockSummary.totalCenters,
        completenessRate: mockSummary.completenessRate,
        avgMilkDays: mockSummary.avgMilkDays,
        avgBalancedDays: mockSummary.avgBalancedDays,
      }
    }
    const s = data?.summary
    if (!s) {
      return {
        centersReporting: 0,
        totalCenters: 0,
        completenessRate: 0,
        avgMilkDays: 0,
        avgBalancedDays: 0,
      }
    }
    const denom = Math.max(1, s.reportingCenters)
    return {
      centersReporting: s.reportingCenters,
      totalCenters: s.centersInScope,
      completenessRate: roundPct(s.feedingCoverage),
      // Presentation of backend day totals — not recomputed from Form VI rows.
      avgMilkDays: Math.round(s.daysWithMilk / denom),
      avgBalancedDays: Math.round(s.daysWithBalancedMeal / denom),
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
    const filtered = q
      ? items.filter((row) => row.centerName.toLowerCase().includes(q))
      : items
    return filtered.map((r) => ({ kind: 'api' as const, row: r }))
  }, [data?.items, mockComparisons, search, source])

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.imirire.title} description={district.imirire.subtitle} />
        <PageContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={district.imirire.selectMonth}>
              <TextInput
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="!min-h-11 sm:!min-h-12"
              />
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
                label={district.imirire.completeness}
                value={`${summaryCards.completenessRate}%`}
                variant={summaryCards.completenessRate >= 70 ? 'success' : 'warning'}
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
                            {row.coverage != null ? `${roundPct(row.coverage)}%` : '—'}
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
    </DistrictLayout>
  )
}
