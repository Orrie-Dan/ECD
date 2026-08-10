import { useMemo, useState } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { useData } from '@/contexts/AppContext'
import { useReferralsMonitoringView } from '@/features/monitoring'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import { formatDate } from '@/lib/mock-data'
import { ECD_CENTERS } from '@/lib/mock-data'
import { buildReferralListRows } from '@/lib/referral-utils'
import type { ReferralSourceType, ReferralStatus } from '@/types'

type StatusFilter = ReferralStatus | 'all' | 'overdue'
type SourceFilter = ReferralSourceType | 'all'

export function ReferralMonitoringPage() {
  const { children, referrals, stedAssessments } = useData()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [sector, setSector] = useState('all')

  const { data, mockSummary, mockComparisons, isLoading, source } = useReferralsMonitoringView({
    children,
    referrals,
    stedAssessments,
  })

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

  /** Detail list remains operational-domain (monitoring API is aggregate-only). */
  const listRows = useMemo(() => {
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

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.referrals.title} description={district.referrals.subtitle} />
        <PageContent className="space-y-6">
          {isLoading ? (
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

          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label={district.referrals.filterStatus}>
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
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
            {listRows.length === 0 ? (
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
                    {listRows.map(({ referral, childName, centerName, overdue }) => (
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
    </DistrictLayout>
  )
}
