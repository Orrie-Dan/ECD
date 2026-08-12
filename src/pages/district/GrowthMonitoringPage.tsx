import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, HeartPulse, ShieldAlert } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { GrowthSummaryCards } from '@/components/growth/GrowthSummaryCards'
import {
  DistrictGrowthChildrenTable,
  DistrictGrowthFilterBar,
  DistrictGrowthTrendSection,
  NutritionAlertList,
} from '@/components/district/growth'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useData } from '@/contexts/AppContext'
import { useNutritionMonitoringView, roundPct, yearMonthToMonitoringRange } from '@/features/monitoring'
import { useDistrictNutritionAlerts, useDistrictNutritionScreenings } from '@/features/district'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { env } from '@/config/env'
import { ECD_CENTERS, calculateAge } from '@/lib/mock-data'
import { getAssessmentDueStatus } from '@/lib/nutrition'
import {
  DEFAULT_DISTRICT_GROWTH_FILTERS,
  buildCoverageByCenterSeries,
  buildDistrictGrowthChildRows,
  buildNutritionAlerts,
  computeCenterGrowthComparison,
  filterDistrictGrowthRows,
  isDistrictGrowthFiltersActive,
  type DistrictGrowthChildRow,
  type DistrictGrowthFilters,
  type GrowthSummaryStats,
  type NutritionAlert,
  type NutritionAlertKind,
} from '@/lib/nutrition-utils'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { Child, GrowthMeasurement, NutritionAssessment } from '@/types'
import type { NutritionAlertViewModel } from '@/models/nutrition'
import type { NutritionScreeningListItemViewModel } from '@/models/nutrition-screenings'

function mapApiNutritionAlertToUi(alert: NutritionAlertViewModel): NutritionAlert {
  let kind: NutritionAlertKind = 'at_risk'
  if (alert.type === 'severe_nutrition') kind = 'severe'
  else if (alert.type === 'overdue_screening') kind = 'overdue'
  else if (alert.type === 'requires_referral') kind = 'at_risk'

  return {
    id: alert.id,
    childId: alert.childId,
    childName: alert.childFullName,
    centerId: alert.centerId,
    centerName: alert.centerName ?? '—',
    kind,
    nutritionStatus: alert.nutritionStatus,
    recommendationKey: kind,
    lastScreeningDate: alert.screeningDate,
    priority: kind === 'severe' || kind === 'overdue' ? 1 : 3,
  }
}

function mapScreeningToGrowthRow(
  item: NutritionScreeningListItemViewModel,
): DistrictGrowthChildRow {
  const dob = item.childDateOfBirth
  return {
    childId: item.childId,
    fullName: item.childFullName,
    dateOfBirth: dob,
    age: calculateAge(dob),
    gender: item.childGender === 'female' ? 'Umukobwa' : 'Umuhungu',
    centerId: item.centerId,
    centerName: item.centerName,
    sector: '—',
    lastScreeningDate: item.screeningDate,
    nutritionStatus: item.nutritionStatus,
    requiresReferral: item.requiresReferral,
    dueStatus: getAssessmentDueStatus(item.screeningDate),
  }
}

function yearMonthToDateOnlyRange(yearMonth: string): { from: string; to: string } {
  const range = yearMonthToMonitoringRange(yearMonth)
  return {
    from: (range.from ?? `${yearMonth}-01`).slice(0, 10),
    to: (range.to ?? `${yearMonth}-28`).slice(0, 10),
  }
}

export function GrowthMonitoringPage() {
  if (env.isLive) {
    return (
      <GrowthMonitoringPageShared
        children={[] as Child[]}
        growthMeasurements={[] as GrowthMeasurement[]}
        nutritionAssessments={[] as NutritionAssessment[]}
      />
    )
  }
  return <GrowthMonitoringPageMock />
}

function GrowthMonitoringPageMock() {
  const { children, growthMeasurements, nutritionAssessments } = useData()
  return (
    <GrowthMonitoringPageShared
      children={children}
      growthMeasurements={growthMeasurements}
      nutritionAssessments={nutritionAssessments}
    />
  )
}

function GrowthMonitoringPageShared({
  children,
  growthMeasurements,
  nutritionAssessments,
}: {
  children: Child[]
  growthMeasurements: GrowthMeasurement[]
  nutritionAssessments: NutritionAssessment[]
}) {
  const [filters, setFilters] = useState<DistrictGrowthFilters>(DEFAULT_DISTRICT_GROWTH_FILTERS)
  const [screeningPage, setScreeningPage] = useState(1)

  const debouncedSearch = useDebounce(filters.search, 300)
  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  )

  const centerId =
    effectiveFilters.centerId && effectiveFilters.centerId !== 'all'
      ? effectiveFilters.centerId
      : undefined

  const monthRange = useMemo((): { from?: string; to?: string } => {
    if (!effectiveFilters.yearMonth) return {}
    return yearMonthToMonitoringRange(effectiveFilters.yearMonth)
  }, [effectiveFilters.yearMonth])

  const screeningDateRange = useMemo((): { from?: string; to?: string } => {
    if (!effectiveFilters.yearMonth) return {}
    return yearMonthToDateOnlyRange(effectiveFilters.yearMonth)
  }, [effectiveFilters.yearMonth])

  const nutritionMonitoring = useNutritionMonitoringView({
    children,
    growthMeasurements,
    nutritionAssessments,
    centerId,
    from: monthRange.from,
    to: monthRange.to,
  })

  const liveAlertsQ = useDistrictNutritionAlerts(
    { centerId },
    env.isLive,
  )

  const liveScreeningsQ = useDistrictNutritionScreenings(
    {
      centerId,
      from: screeningDateRange.from,
      to: screeningDateRange.to,
      nutritionStatus:
        effectiveFilters.status !== 'all' ? effectiveFilters.status : undefined,
      page: screeningPage,
      pageSize: 50,
    },
    env.isLive,
  )

  const liveScreeningRows = useMemo(
    () => (liveScreeningsQ.data?.items ?? []).map(mapScreeningToGrowthRow),
    [liveScreeningsQ.data?.items],
  )

  const allRows = useMemo(
    () =>
      buildDistrictGrowthChildRows(
        children,
        growthMeasurements,
        nutritionAssessments,
        calculateAge,
      ),
    [children, growthMeasurements, nutritionAssessments],
  )

  const filteredRows = useMemo(
    () => filterDistrictGrowthRows(allRows, effectiveFilters),
    [allRows, effectiveFilters],
  )

  const summary: GrowthSummaryStats = useMemo(() => {
    const s = nutritionMonitoring.data?.summary
    if (!s) {
      return {
        totalChildren: 0,
        assessed: 0,
        upToDate: 0,
        due: 0,
        overdue: 0,
        atRisk: 0,
        coverageRate: 0,
      }
    }
    return {
      totalChildren: s.activeChildren,
      assessed: s.screenings,
      upToDate: Math.max(0, s.activeChildren - s.overdueScreenings - s.neverScreened),
      due: 0,
      overdue: s.overdueScreenings,
      atRisk: s.atRisk,
      coverageRate: roundPct(s.screeningCoverage),
    }
  }, [nutritionMonitoring.data?.summary])

  const statusCounts = useMemo(() => {
    const s = nutritionMonitoring.data?.summary
    return {
      normal: s?.normal ?? 0,
      at_risk: s?.atRisk ?? 0,
      moderate: s?.moderate ?? 0,
      severe: s?.severe ?? 0,
      requiresReferral: s?.requiresReferral ?? 0,
      unassessed: s?.neverScreened ?? 0,
    }
  }, [nutritionMonitoring.data?.summary])

  const alerts = useMemo(() => buildNutritionAlerts(filteredRows, 8), [filteredRows])

  const liveAlerts = useMemo((): NutritionAlert[] => {
    const items = liveAlertsQ.data?.items ?? []
    return items.slice(0, 8).map(mapApiNutritionAlertToUi)
  }, [liveAlertsQ.data?.items])

  const centerRows = useMemo(() => {
    if (nutritionMonitoring.source === 'api' && nutritionMonitoring.data) {
      return nutritionMonitoring.data.items
        .map((item) => ({
          centerId: item.centerId,
          centerName: item.centerName,
          sector: '—',
          totalChildren: item.screenings,
          assessed: item.screenings,
          overdue: 0,
          atRisk: item.atRisk,
          coverageRate: 0,
        }))
        .sort((a, b) => b.atRisk - a.atRisk)
    }
    const centers = ECD_CENTERS.map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
    }))
    const ids = new Set(filteredRows.map((r) => r.childId))
    const filteredChildren = children.filter((c) => ids.has(c.id))
    return computeCenterGrowthComparison(
      filteredChildren,
      growthMeasurements,
      nutritionAssessments,
      centers,
    )
      .filter((row) => row.totalChildren > 0)
      .sort((a, b) => a.coverageRate - b.coverageRate)
  }, [
    children,
    filteredRows,
    growthMeasurements,
    nutritionAssessments,
    nutritionMonitoring.data,
    nutritionMonitoring.source,
  ])

  const filterCenters = useMemo(() => {
    if (env.isLive) {
      return (nutritionMonitoring.data?.items ?? []).map((item) => ({
        id: item.centerId,
        name: item.centerName,
        sector: '—',
      }))
    }
    return ECD_CENTERS.map((c) => ({ id: c.id, name: c.name, sector: c.sector }))
  }, [nutritionMonitoring.data?.items])

  const coverageSeries = useMemo(
    () => buildCoverageByCenterSeries(centerRows, 8),
    [centerRows],
  )

  const pagination = usePagination(filteredRows, {
    resetDeps: [effectiveFilters],
  })

  const hasActiveFilters = isDistrictGrowthFiltersActive(effectiveFilters)
  const showReset =
    hasActiveFilters ||
    filters.search.trim().length > 0 ||
    filters.search !== debouncedSearch

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_DISTRICT_GROWTH_FILTERS)
    setScreeningPage(1)
  }, [])

  const patchFilters = useCallback((next: Partial<DistrictGrowthFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
    setScreeningPage(1)
  }, [])

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.growth.title} description={district.growth.subtitle} />
        <PageContent className="space-y-6">
          {nutritionMonitoring.isError ? (
            <LiveUnavailableState
              title={common.error}
              description="Ntibyashoboye kubona amakuru y'imikurire kuri API. Ongera ugerageze."
              action={
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void nutritionMonitoring.refetch?.()}
                >
                  {common.reset}
                </Button>
              }
            />
          ) : nutritionMonitoring.isLoading ? (
            <SkeletonPage label={district.growth.title} stats={5} />
          ) : (
            <>
              <GrowthSummaryCards
                stats={summary}
                compact
                labels={{
                  total: district.growth.totalChildren,
                  due: district.growth.due,
                  overdue: district.growth.overdue,
                  atRisk: district.growth.atRisk,
                  coverage: district.growth.coverage,
                }}
              />

              <div
                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch"
                role="group"
                aria-label={district.growth.nutritionSummary}
              >
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    label={district.growth.statusNormal}
                    value={statusCounts.normal}
                    icon={<CheckCircle2 size={18} className="text-success" />}
                    variant="success"
                    compact
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    label={district.growth.statusAtRisk}
                    value={statusCounts.at_risk}
                    icon={<AlertTriangle size={18} className="text-warning" />}
                    variant="warning"
                    compact
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    label={district.growth.statusModerate}
                    value={statusCounts.moderate}
                    icon={<HeartPulse size={18} className="text-warning" />}
                    variant="warning"
                    compact
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    label={district.growth.statusSevere}
                    value={statusCounts.severe}
                    icon={<ShieldAlert size={18} className="text-error" />}
                    variant="danger"
                    compact
                  />
                </div>
                <div className="h-full [&>div]:h-full">
                  <StatCard
                    label={district.growth.requiresReferral}
                    value={statusCounts.requiresReferral}
                    icon={<AlertTriangle size={18} className="text-error" />}
                    variant="danger"
                    compact
                  />
                </div>
              </div>
            </>
          )}

          <DistrictGrowthFilterBar
            filters={filters}
            centers={filterCenters}
            onChange={patchFilters}
            onReset={resetFilters}
            showReset={showReset}
            liveMode={env.isLive}
          />

          {hasActiveFilters && !env.isLive && (
            <FilterResultsBar
              count={filteredRows.length}
              onClear={resetFilters}
              showClear
            />
          )}

          {env.isLive ? (
            <>
              {liveAlertsQ.isError ? (
                <LiveUnavailableState
                  title={district.growth.alertsTitle}
                  description="Ntibyashoboye kubona amatangazo y'imirire kuri API."
                  action={
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void liveAlertsQ.refetch()}
                    >
                      {common.reset}
                    </Button>
                  }
                />
              ) : liveAlertsQ.isLoading ? (
                <SkeletonPage label={district.growth.title} stats={0} />
              ) : (
                <NutritionAlertList alerts={liveAlerts} />
              )}
              {liveScreeningsQ.isError ? (
                <LiveUnavailableState
                  title={district.growth.tableTitle}
                  description="Ntibyashoboye kubona urutonde rw’ibipimo by’imirire kuri API. Ongera ugerageze."
                  action={
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void liveScreeningsQ.refetch()}
                    >
                      {common.reset}
                    </Button>
                  }
                />
              ) : liveScreeningsQ.isLoading ? (
                <SkeletonPage label={district.growth.tableTitle} stats={0} />
              ) : (
                <DistrictGrowthChildrenTable
                  rows={liveScreeningRows}
                  searchQuery=""
                  page={liveScreeningsQ.data?.page ?? 1}
                  pageSize={liveScreeningsQ.data?.pageSize ?? 50}
                  total={liveScreeningsQ.data?.total ?? 0}
                  totalPages={liveScreeningsQ.data?.totalPages ?? 1}
                  startIndex={
                    ((liveScreeningsQ.data?.page ?? 1) - 1) *
                      (liveScreeningsQ.data?.pageSize ?? 50) +
                    1
                  }
                  endIndex={Math.min(
                    (liveScreeningsQ.data?.page ?? 1) *
                      (liveScreeningsQ.data?.pageSize ?? 50),
                    liveScreeningsQ.data?.total ?? 0,
                  )}
                  hasPrevious={(liveScreeningsQ.data?.page ?? 1) > 1}
                  hasNext={
                    (liveScreeningsQ.data?.page ?? 1) <
                    (liveScreeningsQ.data?.totalPages ?? 1)
                  }
                  onPageChange={setScreeningPage}
                  onPageSizeChange={() => undefined}
                  onResetFilters={resetFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              )}
            </>
          ) : (
            <>
              <NutritionAlertList alerts={alerts} />
              <DistrictGrowthChildrenTable
                rows={pagination.items}
                searchQuery={debouncedSearch}
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
                onResetFilters={resetFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </>
          )}

          {!nutritionMonitoring.isLoading && !nutritionMonitoring.isError && (
            <DistrictGrowthTrendSection
              coverageSeries={coverageSeries}
              statusCounts={statusCounts}
            />
          )}

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.growth.centerComparison}</h2>
            {centerRows.length === 0 ? (
              <p className="text-body text-text-secondary text-center py-8">
                {district.growth.noCenters}
              </p>
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
                        {district.growth.totalChildren}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.growth.assessed}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.growth.overdue}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {district.growth.atRisk}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3">
                        {district.growth.coverage}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {centerRows.slice(0, 20).map((row) => (
                      <tr
                        key={row.centerId}
                        className="border-b border-border last:border-0 hover:bg-background-subtle/60"
                      >
                        <td
                          className="py-3 pr-4 text-body font-medium text-text"
                          data-label={district.growth.center}
                        >
                          {row.centerName}
                        </td>
                        <td className="py-3 pr-4 text-body" data-label={district.growth.sector}>
                          {row.sector}
                        </td>
                        <td
                          className="py-3 pr-4 text-body"
                          data-label={district.growth.totalChildren}
                        >
                          {row.totalChildren}
                        </td>
                        <td className="py-3 pr-4 text-body" data-label={district.growth.assessed}>
                          {row.assessed}
                        </td>
                        <td className="py-3 pr-4 text-body" data-label={district.growth.overdue}>
                          {nutritionMonitoring.source === 'api' ? '—' : row.overdue}
                        </td>
                        <td className="py-3 pr-4 text-body" data-label={district.growth.atRisk}>
                          {row.atRisk}
                        </td>
                        <td
                          className="py-3 text-body font-semibold"
                          data-label={district.growth.coverage}
                        >
                          {nutritionMonitoring.source === 'api' ? '—' : `${row.coverageRate}%`}
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
