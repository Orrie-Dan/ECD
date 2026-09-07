import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Baby,
  Building2,
  ChevronRight,
  Ruler,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { useDashboardMonitoring, roundPct } from '@/features/monitoring'
import { useCenterDirectoryItem } from '@/features/centers'
import { useDistrictScope } from '@/features/district/overview/useDistrictScope'
import { useDistrictOverviewAdminUnits } from '@/features/district/overview/queries'
import { buildCenterDetailPath, displayEntityLabel } from '@/lib/entity-routes'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { demographicsCopy } from '@/locales/rw/demographics'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import { ArcGisMapEmbed } from '@/components/gis/ArcGisMapEmbed'
import { getSchoolsTableData } from '@/lib/mock-data'
import type { CenterDirectoryItem } from '@/api/resources/centers'
import type { Child, GrowthMeasurement, NutritionAssessment } from '@/types'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

type DistrictKpiKey = 'children' | 'centers' | 'attendance' | 'nutrition'

const KPI_ICONS: Record<DistrictKpiKey, ReactNode> = {
  children: <Baby size={18} aria-hidden />,
  centers: <Building2 size={18} aria-hidden />,
  attendance: <Users size={18} aria-hidden />,
  nutrition: <Ruler size={18} aria-hidden />,
}

const KPI_ICON_TONES: Record<DistrictKpiKey, string> = {
  children: 'bg-primary-light text-primary',
  centers: 'bg-secondary-light text-secondary',
  attendance: 'bg-success-light text-success',
  nutrition: 'bg-primary-light text-primary',
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return district.overview.noRate
  return `${roundPct(rate)}%`
}

export function DistrictOverviewCommand({
  children = [],
  growthMeasurements = [],
  nutritionAssessments = [],
}: {
  children?: Child[]
  growthMeasurements?: GrowthMeasurement[]
  nutritionAssessments?: NutritionAssessment[]
}) {
  const [params, setParams] = useSearchParams()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)

  const scope = useDistrictScope()
  const sectorId = params.get('sector')?.trim() || ''
  const centreId = params.get('centre')?.trim() || ''
  const range = useMemo(() => resolveEffectiveDateRange(periodFilter), [periodFilter])

  const patchParams = (next: { sector?: string | null; centre?: string | null }) => {
    const copy = new URLSearchParams(params)
    const apply = (key: string, value: string | null | undefined) => {
      if (!value) copy.delete(key)
      else copy.set(key, value)
    }
    if ('sector' in next) apply('sector', next.sector)
    if ('centre' in next) apply('centre', next.centre)
    setParams(copy, { replace: true })
  }

  const {
    dashboard,
    growthCoverage,
    isLoading,
    isError,
    refetch,
  } = useDashboardMonitoring({
    range,
    children,
    growthMeasurements,
    nutritionAssessments,
  })

  const sectorsQuery = useDistrictOverviewAdminUnits(
    { districtId: scope.districtId ?? undefined, level: 'sector' },
    Boolean(scope.districtId),
  )
  const centerDetail = useCenterDirectoryItem(centreId || undefined, Boolean(centreId) && env.isLive)

  const sectors = sectorsQuery.data ?? []
  const selectedSector = sectors.find((s) => s.id === sectorId) ?? null
  const districtName = scope.districtName

  const mockCenters = useMemo(() => (env.isLive ? [] : getSchoolsTableData()), [])

  const attendanceRate = roundPct(dashboard?.attendance.rate)
  const totalChildren = dashboard?.children.active ?? dashboard?.children.total ?? 0
  const centersInScope = dashboard?.centersInScope ?? 0
  const selectedLiveCenter = centerDetail.data ?? null
  const selectedMockCenter = mockCenters.find((c) => c.id === centreId) ?? null

  const districtKpis: Array<{
    key: DistrictKpiKey
    label: string
    value: string
    href?: string
  }> = [
    {
      key: 'children',
      label: district.overview.children,
      value: totalChildren.toLocaleString(),
      href: DISTRICT_PATHS.demographics,
    },
    {
      key: 'centers',
      label: district.nav.centers,
      value: String(centersInScope),
      href: DISTRICT_PATHS.centers,
    },
    {
      key: 'attendance',
      label: district.overview.attendance,
      value: `${attendanceRate}%`,
      href: DISTRICT_PATHS.monitoringAttendance,
    },
    {
      key: 'nutrition',
      label: district.overview.nutritionCoverage,
      value: growthCoverage == null ? district.overview.noRate : `${growthCoverage}%`,
      href: DISTRICT_PATHS.monitoringGrowth,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={district.dashboard.title}
        description={district.overview.intelligence}
        size="compact"
        action={
          <ChartPeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            className="w-full md:max-w-md"
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
        <span className="font-semibold text-text">
          {district.overview.scopeLabel}: {districtName ?? '—'}
        </span>
        {selectedSector ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">{selectedSector.name}</span>
          </>
        ) : !env.isLive && sectorId ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">{displayEntityLabel(sectorId)}</span>
          </>
        ) : null}
        {centerDetail.data || selectedMockCenter ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">
              {centerDetail.data?.name ?? selectedMockCenter?.name}
            </span>
          </>
        ) : null}
        <span className="ml-auto text-text-muted">
          {district.overview.periodLabel}: {range.timeLabel}
        </span>
      </div>

      {isError ? null : isLoading || !dashboard ? (
        <Skeleton className="h-[4.5rem] w-full" rounded="xl" />
      ) : (
        <section aria-labelledby="district-kpis">
          <h2 id="district-kpis" className="sr-only">
            {district.overview.summaryTitle}
          </h2>
          <Card padding="none" className="overflow-hidden border-border">
            <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
              {districtKpis.map((kpi) => (
                <CompactDistrictKpi key={kpi.key} kpi={kpi} />
              ))}
            </div>
          </Card>
        </section>
      )}

      {isError ? (
        <LiveUnavailableState
          title={district.dashboard.title}
          description={district.overview.loadError}
          action={
            <Button type="button" variant="primary" onClick={() => void refetch?.()}>
              {common.reset}
            </Button>
          }
        />
      ) : isLoading || !dashboard ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)] gap-3 items-stretch">
          <Card padding="none" className="overflow-hidden flex h-full min-h-[32rem] flex-col lg:min-h-[40rem]">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
              <div>
                <h2 className="text-body font-semibold text-text">{district.gis.mapViewTitle}</h2>
                <p className="text-caption text-text-muted">{district.overview.mapHint}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ArcGisMapEmbed
                title={district.gis.mapViewTitle}
                fill
                minHeight="24rem"
                className="h-full rounded-none border-0"
              />
            </div>
          </Card>

          {centreId ? (
            <CentrePreview
              liveCenter={selectedLiveCenter}
              mockCenter={selectedMockCenter}
              districtName={districtName}
              onClose={() => patchParams({ centre: null })}
            />
          ) : (
            <DistrictSummaryPanel
              centers={dashboard.centersInScope}
              childrenCount={totalChildren}
              attendanceRate={attendanceRate}
              nutritionCoverage={growthCoverage}
            />
          )}
        </div>
      )}
    </div>
  )
}

function CompactDistrictKpi({
  kpi,
}: {
  kpi: { key: DistrictKpiKey; label: string; value: string; href?: string }
}) {
  const body = (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${KPI_ICON_TONES[kpi.key]}`}
      >
        {KPI_ICONS[kpi.key]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.6875rem] font-medium text-text-secondary">{kpi.label}</p>
        <p className="mt-0.5 text-lg font-bold leading-none tabular-nums text-text">{kpi.value}</p>
      </div>
    </div>
  )

  if (!kpi.href) return body

  return (
    <Link to={kpi.href} className="block transition-colors hover:bg-surface-muted/60">
      {body}
    </Link>
  )
}

function DistrictSummaryPanel({
  centers,
  childrenCount,
  attendanceRate,
  nutritionCoverage,
}: {
  centers: number
  childrenCount: number
  attendanceRate: number
  nutritionCoverage: number | null
}) {
  return (
    <Card padding="md" className="h-full">
      <h2 className="text-body font-semibold text-text mb-3">{district.overview.summaryTitle}</h2>
      <dl className="space-y-3">
        <SummaryRow label={district.nav.centers} value={String(centers)} />
        <SummaryRow
          label={district.overview.children}
          value={childrenCount.toLocaleString()}
          href={DISTRICT_PATHS.demographics}
        />
        <SummaryRow label={district.overview.attendance} value={`${attendanceRate}%`} />
        <SummaryRow
          label={district.overview.nutritionCoverage}
          value={nutritionCoverage == null ? district.overview.noRate : `${nutritionCoverage}%`}
        />
      </dl>
      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
        <Link
          to={DISTRICT_PATHS.demographics}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {demographicsCopy.title}
        </Link>
        <Link
          to={DISTRICT_PATHS.centers}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {district.dashboard.viewAllCenters}
        </Link>
        <Link
          to={DISTRICT_PATHS.monitoring}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {district.overview.viewMonitoring}
        </Link>
      </div>
    </Card>
  )
}

function CentrePreview({
  liveCenter,
  mockCenter,
  districtName,
  onClose,
}: {
  liveCenter: CenterDirectoryItem | null
  mockCenter: ReturnType<typeof getSchoolsTableData>[number] | null
  districtName: string | null
  onClose: () => void
}) {
  const name = liveCenter?.name ?? mockCenter?.name
  if (!name) {
    return (
      <Card padding="md" className="h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-body font-semibold text-text">{district.gis.centerPanelTitle}</h2>
          <button type="button" onClick={onClose} aria-label={common.close}>
            <X size={16} />
          </button>
        </div>
        <p className="text-body text-text-secondary">{district.overview.noCentreSelected}</p>
      </Card>
    )
  }

  const childrenCount = liveCenter?.activeChildrenCount ?? mockCenter?.children ?? null
  const sector = mockCenter?.sector ?? liveCenter?.villageName ?? '—'
  const attendance =
    liveCenter && liveCenter.attendancePresentToday != null && liveCenter.attendanceAbsentToday != null
      ? formatRate(
          liveCenter.attendancePresentToday + liveCenter.attendanceAbsentToday > 0
            ? (liveCenter.attendancePresentToday /
                (liveCenter.attendancePresentToday + liveCenter.attendanceAbsentToday)) *
                100
            : null,
        )
      : mockCenter
        ? `${mockCenter.attendance}%`
        : district.overview.noRate
  const statusLabel = liveCenter
    ? liveCenter.status === 'active'
      ? district.schools.statusActive
      : district.schools.statusInactive
    : mockCenter?.isActive
      ? district.schools.statusActive
      : district.schools.statusInactive
  const centerId = liveCenter?.id ?? mockCenter?.id

  return (
    <Card padding="md" className="h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted uppercase tracking-wide">
            {district.gis.centerPanelTitle}
          </p>
          <h2 className="text-subheading text-text mt-1 break-words">{name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={common.close}>
          <X size={16} />
        </button>
      </div>
      <dl className="space-y-2">
        <SummaryRow label={district.centers.sector} value={sector} />
        <SummaryRow label={district.settings.districtName} value={districtName ?? '—'} />
        <SummaryRow
          label={district.overview.children}
          value={childrenCount == null ? '—' : String(childrenCount)}
        />
        <SummaryRow label={district.overview.attendance} value={attendance} />
        <SummaryRow label={district.schools.tableStatus} value={statusLabel} />
      </dl>
      <p className="text-caption text-text-muted mt-3">{district.overview.lastAssessmentUnavailable}</p>
      <p className="text-caption text-text-muted">{district.overview.nutritionStatusUnavailable}</p>
      {centerId ? (
        <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
          <Link
            to={buildCenterDetailPath(DISTRICT_PATHS.centers, {
              id: centerId,
              code: liveCenter?.code,
            })}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl font-semibold bg-primary !text-white"
          >
            {district.overview.viewCentre}
          </Link>
          <Link
            to={DISTRICT_PATHS.followup}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl font-semibold border-2 border-primary text-primary"
          >
            {district.overview.viewFollowup}
          </Link>
        </div>
      ) : null}
    </Card>
  )
}

function SummaryRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  const valueNode = href ? (
    <Link to={href} className="text-body font-semibold text-primary tabular-nums hover:underline">
      {value}
    </Link>
  ) : (
    <span className="text-body font-semibold text-text tabular-nums">{value}</span>
  )

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd>{valueNode}</dd>
    </div>
  )
}
