import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Clock,
  Layers,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/SearchInput'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { useDebounce } from '@/hooks/useDebounce'
import { useDashboardMonitoring, roundPct } from '@/features/monitoring'
import { useFollowUpAlerts } from '@/features/alerts'
import { useCenterDirectoryItem } from '@/features/centers'
import { useDistrictScope } from '@/features/district/overview/useDistrictScope'
import {
  useDistrictOverviewAdminUnits,
  useDistrictOverviewCenters,
} from '@/features/district/overview/queries'
import { buildDistrictMapLayers } from '@/features/district/overview/layers'
import { findSectorForVillage } from '@/lib/rwanda-admin'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import { EcdCenterStatus, type EcdCenterStatus as CenterStatus } from '@/api/generated/models'
import { GisPendingPlaceholder } from '@/components/gis/GisPendingPlaceholder'
import { ACTION_ALERTS, getSchoolsTableData, getUniqueSectors } from '@/lib/mock-data'
import type { CenterDirectoryItem } from '@/api/resources/centers'
import type { Child, GrowthMeasurement, NutritionAssessment } from '@/types'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

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
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | CenterStatus>('all')
  const [layers, setLayers] = useState(buildDistrictMapLayers)
  const [layersOpen, setLayersOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const scope = useDistrictScope()
  const sectorId = params.get('sector')?.trim() || ''
  const centreId = params.get('centre')?.trim() || ''
  const debouncedSearch = useDebounce(search, 300)
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
    growthOverdue,
    growthAtRisk,
    isLoading,
    isError,
    refetch,
  } = useDashboardMonitoring({
    range,
    children,
    growthMeasurements,
    nutritionAssessments,
  })

  const alertsQ = useFollowUpAlerts({ limit: 100 }, env.isLive)
  const sectorsQuery = useDistrictOverviewAdminUnits(
    { districtId: scope.districtId ?? undefined, level: 'sector' },
    Boolean(scope.districtId),
  )
  const centersQuery = useDistrictOverviewCenters(
    {
      districtId: scope.districtId ?? undefined,
      status: status === 'all' ? undefined : status,
      search: debouncedSearch.trim().length >= 2 ? debouncedSearch : undefined,
      page: 1,
      pageSize: 100,
    },
    env.isLive,
  )
  const centerDetail = useCenterDirectoryItem(centreId || undefined, Boolean(centreId) && env.isLive)

  const liveCenters = centersQuery.data?.items ?? []
  const sectors = sectorsQuery.data ?? []
  const selectedSector = sectors.find((s) => s.id === sectorId) ?? null
  const districtName = scope.districtName

  const filteredLiveCenters = useMemo(() => {
    if (!selectedSector || !districtName) return liveCenters
    return liveCenters.filter((center) => {
      const sectorName = findSectorForVillage(districtName, center.villageName ?? '')
      return sectorName?.toLowerCase() === selectedSector.name.toLowerCase()
    })
  }, [liveCenters, selectedSector, districtName])

  const mockCenters = useMemo(() => (env.isLive ? [] : getSchoolsTableData()), [])
  const mockSectors = useMemo(() => (env.isLive ? [] : getUniqueSectors()), [])

  const filteredMockCenters = useMemo(() => {
    if (env.isLive) return []
    const q = search.trim().toLowerCase()
    return mockCenters.filter((center) => {
      if (status === 'active' && !center.isActive) return false
      if (status === 'inactive' && center.isActive) return false
      if (sectorId && center.sector !== sectorId) return false
      if (q.length >= 2 && !`${center.name} ${center.sector}`.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [mockCenters, search, sectorId, status])

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return { sectors: [] as Array<{ id: string; name: string }>, centers: [] as Array<{ id: string; name: string; meta: string }> }
    if (env.isLive) {
      return {
        sectors: sectors
          .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
          .slice(0, 6)
          .map((s) => ({ id: s.id, name: s.name })),
        centers: filteredLiveCenters
          .filter((c) => `${c.name} ${c.code} ${c.villageName ?? ''}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((c) => ({
            id: c.id,
            name: c.name,
            meta: [c.villageName, c.code].filter(Boolean).join(' · '),
          })),
      }
    }
    return {
      sectors: mockSectors
        .filter((name) => name.toLowerCase().includes(q))
        .slice(0, 6)
        .map((name) => ({ id: name, name })),
      centers: filteredMockCenters
        .filter((c) => `${c.name} ${c.sector}`.toLowerCase().includes(q))
        .slice(0, 6)
        .map((c) => ({ id: c.id, name: c.name, meta: c.sector })),
    }
  }, [search, env.isLive, sectors, filteredLiveCenters, mockSectors, filteredMockCenters])

  const liveAlerts = alertsQ.data?.items ?? []
  const mockAlerts = env.isLive ? [] : ACTION_ALERTS
  const queueItems = env.isLive
    ? liveAlerts.slice(0, 6).map((alert) => ({
        id: alert.id,
        title: alert.centerName ?? alert.title,
        detail: alert.description,
        href: alert.centerId
          ? `${DISTRICT_PATHS.centers}/${alert.centerId}`
          : DISTRICT_PATHS.followup,
        priority: alert.priority,
      }))
    : mockAlerts.slice(0, 6).map((alert) => ({
        id: alert.id,
        title: alert.centerName,
        detail: alert.description,
        href: `${DISTRICT_PATHS.centers}/${alert.centerId}`,
        priority: alert.priority,
      }))

  const attentionCenterCount = env.isLive
    ? new Set(liveAlerts.map((a) => a.centerId).filter(Boolean)).size
    : new Set(mockAlerts.map((a) => a.centerId)).size
  const followUpCount = env.isLive ? (alertsQ.data?.total ?? liveAlerts.length) : mockAlerts.length
  const overdueCount = growthOverdue ?? 0

  const attendanceRate = roundPct(dashboard?.attendance.rate)
  const totalChildren = dashboard?.children.active ?? dashboard?.children.total ?? 0
  const selectedLiveCenter =
    filteredLiveCenters.find((c) => c.id === centreId) ?? centerDetail.data ?? null
  const selectedMockCenter = filteredMockCenters.find((c) => c.id === centreId) ?? null

  const selectSector = (id: string) => {
    setSearch('')
    setSearchOpen(false)
    patchParams({ sector: id, centre: null })
  }

  const selectCenter = (id: string) => {
    setSearch('')
    setSearchOpen(false)
    patchParams({ centre: id })
  }

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
            <span className="font-semibold text-text">{sectorId}</span>
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

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setSearchOpen(value.trim().length >= 2)
            }}
            placeholder={district.overview.searchPlaceholder}
            onFocus={() => {
              if (search.trim().length >= 2) setSearchOpen(true)
            }}
          />
          {searchOpen && search.trim().length >= 2 ? (
            <div
              className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-80 overflow-y-auto"
              role="listbox"
            >
              {searchHits.sectors.length === 0 && searchHits.centers.length === 0 ? (
                <p className="px-3 py-3 text-caption text-text-secondary">
                  {district.overview.searchNoResults}
                </p>
              ) : (
                <>
                  {searchHits.sectors.length > 0 ? (
                    <SearchGroup label={district.overview.searchSectors}>
                      {searchHits.sectors.map((s) => (
                        <SearchRow
                          key={s.id}
                          label={s.name}
                          onSelect={() => selectSector(s.id)}
                        />
                      ))}
                    </SearchGroup>
                  ) : null}
                  {searchHits.centers.length > 0 ? (
                    <SearchGroup label={district.overview.searchCenters}>
                      {searchHits.centers.map((c) => (
                        <SearchRow
                          key={c.id}
                          label={c.name}
                          meta={c.meta}
                          onSelect={() => selectCenter(c.id)}
                        />
                      ))}
                    </SearchGroup>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setLayersOpen((open) => !open)
              setFiltersOpen(false)
            }}
          >
            <Layers size={16} aria-hidden />
            {district.overview.layers}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFiltersOpen((open) => !open)
              setLayersOpen(false)
            }}
          >
            <SlidersHorizontal size={16} aria-hidden />
            {district.overview.filters}
          </Button>
        </div>
      </div>

      {layersOpen ? (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-subheading font-semibold">{district.overview.layers}</h2>
            <button type="button" onClick={() => setLayersOpen(false)} aria-label={common.close}>
              <X size={16} />
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {layers.map((layer) => (
              <li key={layer.id}>
                <label
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                    layer.availability === 'unavailable'
                      ? 'border-border bg-background-subtle/50 text-text-muted'
                      : 'border-border bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={layer.enabled}
                    disabled={layer.availability === 'unavailable'}
                    onChange={() =>
                      setLayers((prev) =>
                        prev.map((item) =>
                          item.id === layer.id ? { ...item, enabled: !item.enabled } : item,
                        ),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-text">{layer.label}</span>
                    <span className="block text-caption text-text-secondary">{layer.description}</span>
                    {layer.availability === 'unavailable' ? (
                      <Badge variant="neutral" className="mt-1">
                        {district.overview.layerUnavailable}
                      </Badge>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {filtersOpen ? (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-subheading font-semibold">{district.overview.filters}</h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStatus('all')
                patchParams({ sector: null, centre: null })
              }}
            >
              {district.overview.clearFilters}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={district.centers.sector}>
              <SelectInput
                value={sectorId}
                onChange={(e) => patchParams({ sector: e.target.value || null, centre: null })}
                disabled={env.isLive && !scope.districtId}
              >
                <option value="">{district.overview.sectorAll}</option>
                {env.isLive
                  ? sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  : mockSectors.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
              </SelectInput>
            </FormField>
            <FormField label={district.schools.filterStatus}>
              <SelectInput
                value={status}
                onChange={(e) => setStatus((e.target.value || 'all') as 'all' | CenterStatus)}
              >
                <option value="all">{district.overview.statusAll}</option>
                <option value={EcdCenterStatus.active}>{district.schools.statusGood}</option>
                <option value={EcdCenterStatus.inactive}>{district.schools.inactiveSchools}</option>
              </SelectInput>
            </FormField>
          </div>
          {env.isLive && !scope.districtId ? (
            <p className="text-caption text-text-muted mt-2">{common.live.sectorFilterUnavailable}</p>
          ) : null}
        </Card>
      ) : null}

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
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)] gap-3">
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <div>
                <h2 className="text-body font-semibold text-text">{district.gis.mapViewTitle}</h2>
                <p className="text-caption text-text-muted">{district.overview.mapHint}</p>
              </div>
            </div>
            <div className="p-3">
              <GisPendingPlaceholder className="min-h-[18rem] lg:min-h-[24rem]" />
              <p className="text-caption text-text-muted mt-2">
                {district.overview.centerListTitle}
              </p>
              <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                {(env.isLive ? filteredLiveCenters : filteredMockCenters).slice(0, 20).map((center) => {
                  const id = center.id
                  const name = center.name
                  const active = id === centreId
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => selectCenter(id)}
                        className={`w-full text-left px-3 py-2 text-body hover:bg-background-subtle ${
                          active ? 'bg-primary-light text-primary font-semibold' : 'text-text'
                        }`}
                      >
                        {name}
                      </button>
                    </li>
                  )
                })}
              </ul>
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

      <section aria-labelledby="priority-heading">
        <h2 id="priority-heading" className="text-subheading text-text mb-2">
          {district.overview.priorityTitle}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Link to={DISTRICT_PATHS.followup} className="block">
            <StatCard
              compact
              label={district.overview.centresNeedAttention}
              value={attentionCenterCount}
              icon={<Building2 size={18} className="text-warning" />}
              variant="warning"
            />
          </Link>
          <Link to={DISTRICT_PATHS.followup} className="block">
            <StatCard
              compact
              label={district.overview.followUps}
              value={followUpCount}
              icon={<AlertTriangle size={18} className="text-error" />}
              variant="warning"
            />
          </Link>
          <Link to={DISTRICT_PATHS.monitoringGrowth} className="block">
            <StatCard
              compact
              label={district.overview.overdue}
              value={overdueCount}
              icon={<Clock size={18} className="text-warning" />}
              variant="warning"
            />
          </Link>
        </div>
        <p className="text-caption text-text-muted mt-2">
          {district.overview.situationTitle}: {dashboard?.centersInScope ?? '—'} {district.nav.centers} ·{' '}
          {totalChildren} {district.overview.children} · {attendanceRate}% {district.overview.attendance}
          {growthAtRisk != null ? ` · ${growthAtRisk} ${district.dashboard.growthAtRisk}` : ''}
        </p>
      </section>

      <section aria-labelledby="queue-heading">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 id="queue-heading" className="text-subheading text-text">
            {district.overview.actionQueueTitle}
          </h2>
          <Link
            to={DISTRICT_PATHS.followup}
            className="text-caption font-semibold text-primary hover:underline"
          >
            {district.overview.viewAllFollowup}
          </Link>
        </div>
        {queueItems.length === 0 ? (
          <Card padding="md" className="border-success/20 bg-success-light/20">
            <p className="text-body font-semibold text-success">{district.overview.emptyQueue}</p>
          </Card>
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-border">
              {queueItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background-subtle"
                  >
                    <span className="min-w-0">
                      <span className="block text-body font-semibold text-text truncate">{item.title}</span>
                      <span className="block text-caption text-text-secondary truncate">{item.detail}</span>
                    </span>
                    <ChevronRight size={16} className="text-primary shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
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
    <Card padding="md">
      <h2 className="text-body font-semibold text-text mb-3">{district.overview.summaryTitle}</h2>
      <dl className="space-y-3">
        <SummaryRow label={district.nav.centers} value={String(centers)} />
        <SummaryRow label={district.overview.children} value={childrenCount.toLocaleString()} />
        <SummaryRow label={district.overview.attendance} value={`${attendanceRate}%`} />
        <SummaryRow
          label={district.overview.nutritionCoverage}
          value={nutritionCoverage == null ? district.overview.noRate : `${nutritionCoverage}%`}
        />
      </dl>
      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
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
      <Card padding="md">
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
      ? district.overview.statusGood
      : district.schools.inactiveSchools
    : mockCenter?.attentionStatus === 'none'
      ? district.overview.statusGood
      : district.overview.statusAttention
  const centerId = liveCenter?.id ?? mockCenter?.id

  return (
    <Card padding="md">
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
            to={`${DISTRICT_PATHS.centers}/${centerId}`}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl font-semibold bg-primary text-white"
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="text-body font-semibold text-text tabular-nums">{value}</dd>
    </div>
  )
}

function SearchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-caption font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      {children}
    </div>
  )
}

function SearchRow({
  label,
  meta,
  onSelect,
}: {
  label: string
  meta?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="w-full text-left px-3 py-2 hover:bg-background-subtle"
      onClick={onSelect}
    >
      <span className="block text-body text-text">{label}</span>
      {meta ? <span className="block text-caption text-text-muted">{meta}</span> : null}
    </button>
  )
}
