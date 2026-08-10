import { useMemo } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { useData } from '@/contexts/AppContext'
import { useStedMonitoringView, roundPct } from '@/features/monitoring'
import { district } from '@/locales/rw/district'

function coverageVariant(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 70) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

export function StedMonitoringPage() {
  const { children, stedAssessments, referrals } = useData()
  const { data, mockComparisons, mockTotals, isLoading, source } = useStedMonitoringView({
    children,
    stedAssessments,
    referrals,
  })

  const totals = useMemo(() => {
    if (source === 'mock' && mockTotals) {
      return {
        screened: mockTotals.screened,
        coverageRate: mockTotals.coverageRate,
        oyaResponses: mockTotals.oyaResponses,
        referralsCreated: mockTotals.referralsCreated,
        referralsCompleted: mockTotals.referralsCompleted,
      }
    }
    const s = data?.summary
    return {
      screened: s?.assessmentsCompleted ?? 0,
      coverageRate: roundPct(s?.coverage),
      // OYA / referral created-completed are not on STED monitoring API — gap.
      oyaResponses: 0,
      referralsCreated: 0,
      referralsCompleted: 0,
    }
  }, [data?.summary, mockTotals, source])

  const comparisons = useMemo(() => {
    if (source === 'mock' && mockComparisons) return mockComparisons
    return (data?.items ?? []).map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      sector: '—',
      eligible: 0,
      screened: item.assessmentsCompleted,
      coverageRate: 0,
      oyaResponses: 0,
      referralsCreated: 0,
      referralsCompleted: 0,
      averageScore: item.averageScore,
    }))
  }, [data?.items, mockComparisons, source])

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.sted.title} description={district.sted.subtitle} />
        <PageContent className="space-y-6">
          {isLoading ? (
            <SkeletonPage label={district.sted.title} stats={5} />
          ) : (
            <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.sted.screened}
                value={String(totals.screened)}
                variant="info"
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.sted.coverage}
                value={`${totals.coverageRate}%`}
                variant={totals.coverageRate >= 70 ? 'success' : 'warning'}
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.sted.oyaResponses}
                value={source === 'api' ? '—' : String(totals.oyaResponses)}
                variant={totals.oyaResponses > 0 ? 'warning' : 'default'}
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={district.sted.referralsCreated}
                value={source === 'api' ? '—' : String(totals.referralsCreated)}
                variant="warning"
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full col-span-2 lg:col-span-1">
              <StatCard
                label={district.sted.referralsCompleted}
                value={source === 'api' ? '—' : String(totals.referralsCompleted)}
                variant="success"
                compact
              />
            </div>
          </div>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.sted.centerComparison}</h2>
            {comparisons.length === 0 ? (
              <EmptyState title={district.sted.noData} />
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
                        {district.sted.screened}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.sted.coverage}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3">
                        {district.sted.oyaResponses}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row) => {
                      const coverage =
                        'coverageRate' in row && typeof row.coverageRate === 'number'
                          ? row.coverageRate
                          : 0
                      const sector = 'sector' in row ? String(row.sector) : '—'
                      const screened =
                        'screened' in row
                          ? row.screened
                          : (row as { assessmentsCompleted?: number }).assessmentsCompleted ?? 0
                      const oya =
                        source === 'api'
                          ? '—'
                          : String('oyaResponses' in row ? row.oyaResponses : 0)
                      const score =
                        source === 'api' &&
                        'averageScore' in row &&
                        row.averageScore != null
                          ? String(row.averageScore)
                          : oya

                      return (
                        <tr
                          key={row.centerId}
                          className="border-b border-border last:border-0 transition-colors hover:bg-background-subtle/60"
                        >
                          <td
                            className="py-3 pr-4 text-body font-medium"
                            data-label={district.growth.center}
                          >
                            {row.centerName}
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.growth.sector}>
                            {sector}
                          </td>
                          <td className="py-3 pr-4 text-body" data-label={district.sted.screened}>
                            {screened}
                          </td>
                          <td className="py-3 pr-4" data-label={district.sted.coverage}>
                            {source === 'api' ? (
                              <span className="text-body">
                                {'averageScore' in row && row.averageScore != null
                                  ? String(row.averageScore)
                                  : '—'}
                              </span>
                            ) : (
                              <Badge variant={coverageVariant(coverage)} size="sm">
                                {coverage}%
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 text-body" data-label={district.sted.oyaResponses}>
                            {source === 'api' ? score : oya}
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
