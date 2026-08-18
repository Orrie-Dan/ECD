import { useMemo } from 'react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { DistrictWorkspaceNav } from '@/layouts/district/DistrictWorkspaceNav'
import { DISTRICT_MONITORING_TABS } from '@/layouts/district/navigation'
import { Card, StatCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useData } from '@/contexts/AppContext'
import { useStedMonitoringView } from '@/features/monitoring'
import { useMonitoringCentre } from '@/features/district/monitoring/useMonitoringCentre'
import { EnhancedBarChart, formatCountTick } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { ECD_CENTERS } from '@/lib/mock-data'
import { env } from '@/config/env'
import type { Child, Referral, StedAssessment } from '@/types'

export function StedMonitoringPage() {
  if (env.isLive) {
    return (
      <StedMonitoringPageShared
        children={[] as Child[]}
        stedAssessments={[] as StedAssessment[]}
        referrals={[] as Referral[]}
      />
    )
  }
  return <StedMonitoringPageMock />
}

function StedMonitoringPageMock() {
  const { children, stedAssessments, referrals } = useData()
  return (
    <StedMonitoringPageShared
      children={children}
      stedAssessments={stedAssessments}
      referrals={referrals}
    />
  )
}

function StedMonitoringPageShared({
  children,
  stedAssessments,
  referrals,
}: {
  children: Child[]
  stedAssessments: StedAssessment[]
  referrals: Referral[]
}) {
  const { centreId: scopedCentreId, setCentreId: setScopedCentreId } = useMonitoringCentre()
  const { data, mockComparisons, mockTotals, isLoading, isError, source, refetch } = useStedMonitoringView({
    children,
    stedAssessments,
    referrals,
    centerId: scopedCentreId ?? undefined,
  })

  const totals = useMemo(() => {
    if (source === 'mock' && mockTotals) {
      return {
        screened: mockTotals.screened,
        childrenAssessed: mockTotals.screened,
        oyaResponses: mockTotals.oyaResponses,
        referralsCreated: mockTotals.referralsCreated,
        referralsCompleted: mockTotals.referralsCompleted,
      }
    }
    const s = data?.summary
    return {
      screened: s?.assessmentsCompleted ?? 0,
      childrenAssessed: s?.childrenAssessed ?? 0,
      oyaResponses: 0,
      referralsCreated: 0,
      referralsCompleted: 0,
    }
  }, [data?.summary, mockTotals, source])

  const comparisons = useMemo(() => {
    if (source === 'mock' && mockComparisons) return mockComparisons
    return (data?.items ?? [])
      .filter((item) => !scopedCentreId || item.centerId === scopedCentreId)
      .map((item) => ({
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
  }, [data?.items, mockComparisons, scopedCentreId, source])

  const centerOptions = useMemo(() => {
    if (env.isLive) {
      const opts = (data?.items ?? []).map((row) => ({
        id: row.centerId ?? '',
        name: row.centerName ?? '—',
      })).filter((row) => row.id)
      if (scopedCentreId && !opts.some((o) => o.id === scopedCentreId)) {
        return [{ id: scopedCentreId, name: '—' }, ...opts]
      }
      return opts
    }
    return ECD_CENTERS.map((c) => ({ id: c.id, name: c.name }))
  }, [data?.items, scopedCentreId])

  return (
    <>
      <PageContainer>
        <PageHeader title={district.sted.title} description={district.sted.subtitle} />
        <DistrictWorkspaceNav
          items={DISTRICT_MONITORING_TABS}
          ariaLabel={district.monitoringHub.title}
        />
        <PageContent className="space-y-6">
          <div className="w-full sm:w-72">
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
          </div>
          {isLoading ? (
            <SkeletonPage label={district.sted.title} stats={5} />
          ) : isError ? (
            <LiveUnavailableState
              title={common.error}
              description="Ntibyashoboye kubona amakuru ya STED kuri API. Ongera ugerageze."
              action={
                <Button type="button" variant="primary" onClick={() => void refetch?.()}>
                  {common.reset}
                </Button>
              }
            />
          ) : (
            <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
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
                label={district.sted.assessed}
                value={String(totals.childrenAssessed)}
                variant="success"
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
          </div>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.sted.chartTitle}</h2>
            {comparisons.length === 0 ? (
              <EmptyState title={district.sted.noData} />
            ) : (
              <EnhancedBarChart
                data={comparisons.slice(0, 12).map((row) => ({
                  name: row.centerName,
                  value: row.screened,
                }))}
                ariaLabel={district.sted.chartTitle}
                color={CHART_METRIC_COLORS.schools}
                xAxisLabel={district.charts.axisCenter}
                yAxisLabel={district.charts.axisCount}
                yTickFormatter={formatCountTick}
              />
            )}
          </Card>

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
                        {district.sted.assessed}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3">
                        {district.sted.oyaResponses}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row) => {
                      const sector = 'sector' in row ? String(row.sector) : '—'
                      const screened = row.screened
                      const assessed =
                        'eligible' in row && row.eligible > 0 ? row.eligible : screened
                      const oya =
                        source === 'api'
                          ? row.averageScore != null
                            ? String(row.averageScore)
                            : '—'
                          : String(row.oyaResponses)

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
                          <td className="py-3 pr-4 text-body" data-label={district.sted.assessed}>
                            {assessed}
                          </td>
                          <td className="py-3 text-body" data-label={district.sted.oyaResponses}>
                            {oya}
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
