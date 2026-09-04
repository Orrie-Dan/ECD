import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Baby,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/SearchInput'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { roundPct } from '@/features/monitoring'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaCenterDetail,
  useNcdaCenterSummary,
} from '@/features/ncda/centers/queries'
import { useNcdaDistrictDetail, useNcdaDistrictSummary } from '@/features/ncda/districts/queries'
import {
  useNcdaOverviewAdminUnits,
  useNcdaOverviewCenters,
} from '@/features/ncda/overview/queries'
import { useNcdaOverviewData } from '@/features/ncda/overview/useNcdaOverviewData'
import type { OverviewKpi } from '@/features/ncda/overview/types'
import { findSectorForVillage, getProvinceDisplayName, getProvinceKeyForDistrict } from '@/lib/rwanda-admin'
import { kpiDrillDownHref, ncdaDemographicsPath, ncdaNutritionAlertsPath } from '@/lib/ncda-drill-down'
import { buildCenterDetailPath, buildDistrictDetailPath } from '@/lib/entity-routes'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'
import { EcdCenterStatus, type EcdCenterStatus as CenterStatus } from '@/api/generated/models'
import { ArcGisMapEmbed } from '@/components/gis/ArcGisMapEmbed'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

const KPI_ICONS: Record<OverviewKpi['key'], ReactNode> = {
  children: <Baby size={18} aria-hidden />,
  activeCenters: <Building2 size={18} aria-hidden />,
  attendance: <Users size={18} aria-hidden />,
  compliantCenters: <CheckCircle2 size={18} aria-hidden />,
}

const KPI_ICON_TONES: Record<OverviewKpi['key'], string> = {
  children: 'bg-primary-light text-primary',
  activeCenters: 'bg-secondary-light text-secondary',
  attendance: 'bg-success-light text-success',
  compliantCenters: 'bg-primary-light text-primary',
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.dashboard.noRate
  return `${roundPct(rate)}%`
}

function formatTrend(value: number): string {
  const abs = Math.abs(value)
  const digits = abs >= 10 ? 0 : 1
  const body = abs.toFixed(digits).replace(/\.0$/, '')
  if (value > 0) return `↑ ${body}%`
  if (value < 0) return `↓ ${body}%`
  return `${body}%`
}

export function NcdaOverviewCommand() {
  const [params, setParams] = useSearchParams()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | CenterStatus>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const districtId = params.get('district')?.trim() || ''
  const sectorId = params.get('sector')?.trim() || ''
  const centreId = params.get('centre')?.trim() || ''
  const debouncedSearch = useDebounce(search, 300)
  const range = useMemo(() => resolveEffectiveDateRange(periodFilter), [periodFilter])

  const patchParams = (next: {
    district?: string | null
    sector?: string | null
    centre?: string | null
  }) => {
    const copy = new URLSearchParams(params)
    const apply = (key: string, value: string | null | undefined) => {
      if (!value) copy.delete(key)
      else copy.set(key, value)
    }
    if ('district' in next) apply('district', next.district)
    if ('sector' in next) apply('sector', next.sector)
    if ('centre' in next) apply('centre', next.centre)
    setParams(copy, { replace: true })
  }

  const data = useNcdaOverviewData(range, 'overall')
  const { dashboard, dateFilters } = data

  const sectorsQuery = useNcdaOverviewAdminUnits(
    { districtId, level: 'sector' },
    Boolean(districtId),
  )
  const nationalSearch = useNcdaOverviewCenters(
    { search: debouncedSearch, page: 1, pageSize: 8 },
    debouncedSearch.trim().length >= 2 && !districtId,
  )
  const districtCenters = useNcdaOverviewCenters(
    {
      districtId: districtId || undefined,
      status: status === 'all' ? undefined : status,
      page: 1,
      pageSize: 100,
    },
    Boolean(districtId),
  )
  const districtDetail = useNcdaDistrictDetail(districtId || undefined, Boolean(districtId))
  const districtSummary = useNcdaDistrictSummary(
    districtId || undefined,
    dateFilters,
    Boolean(districtId),
  )
  const centerDetail = useNcdaCenterDetail(centreId || undefined, Boolean(centreId))
  const centerSummary = useNcdaCenterSummary(
    centreId || undefined,
    dateFilters,
    Boolean(centreId),
  )

  const districts = data.districts
  const selectedDistrict = districts.find((d) => d.id === districtId) ?? districtDetail.data ?? null
  const sectors = useMemo(() => sectorsQuery.data ?? [], [sectorsQuery.data])
  const selectedSector = sectors.find((s) => s.id === sectorId) ?? null

  const rawCenters = useMemo(
    () => (districtId ? (districtCenters.data?.items ?? []) : []),
    [districtId, districtCenters.data],
  )
  const filteredCenters = useMemo(() => {
    if (!selectedSector || !selectedDistrict) return rawCenters
    return rawCenters.filter((center) => {
      const sectorName = findSectorForVillage(
        selectedDistrict.name,
        center.villageName ?? '',
      )
      return sectorName?.toLowerCase() === selectedSector.name.toLowerCase()
    })
  }, [rawCenters, selectedSector, selectedDistrict])

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return { districts: [], sectors: [], centers: [] }
    return {
      districts: districts
        .filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
        .slice(0, 6),
      sectors: sectors
        .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
        .slice(0, 6),
      centers: districtId
        ? rawCenters
            .filter((c) =>
              `${c.name} ${c.code} ${c.villageName ?? ''}`.toLowerCase().includes(q),
            )
            .slice(0, 6)
        : (nationalSearch.data?.items ?? []),
    }
  }, [search, districts, sectors, rawCenters, districtId, nationalSearch.data?.items])

  const isNationalView = !districtId && !centreId
  const overview = dashboard.overview.data
  const network = dashboard.network.data
  const overviewError = dashboard.overview.isError && !dashboard.overview.data
  const networkError = dashboard.network.isError && !dashboard.network.data

  const selectDistrict = (id: string) => {
    setSearch('')
    setSearchOpen(false)
    patchParams({ district: id, sector: null, centre: null })
  }

  const selectSector = (id: string) => {
    setSearch('')
    setSearchOpen(false)
    patchParams({ sector: id || null, centre: null })
  }

  const selectCenter = (id: string) => {
    const center =
      filteredCenters.find((c) => c.id === id) ??
      nationalSearch.data?.items.find((c) => c.id === id)
    setSearch('')
    setSearchOpen(false)
    patchParams({
      centre: id,
      district: center?.districtId || districtId || null,
      sector: sectorId || null,
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={ncda.sections.dashboard.title}
        description={ncda.overview.intelligence}
        size="compact"
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:max-w-xl">
            <SelectInput
              className="min-h-10 w-full"
              value={districtId}
              onChange={(e) => {
                const value = e.target.value
                if (!value) patchParams({ district: null, sector: null, centre: null })
                else selectDistrict(value)
              }}
              aria-label={ncda.overview.geographyLabel}
            >
              <option value="">{ncda.overview.country}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectInput>
            <ChartPeriodFilter
              value={periodFilter}
              onChange={setPeriodFilter}
              className="w-full"
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => patchParams({ district: null, sector: null, centre: null })}
        >
          {ncda.overview.breadcrumbNational}
        </button>
        {selectedDistrict ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">{selectedDistrict.name}</span>
          </>
        ) : null}
        {selectedSector ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">{selectedSector.name}</span>
          </>
        ) : null}
        {centerDetail.data ? (
          <>
            <ChevronRight size={14} aria-hidden />
            <span className="font-semibold text-text">{centerDetail.data.name}</span>
          </>
        ) : null}
        <span className="ml-auto text-text-muted">
          {ncda.overview.periodFilterLabel}: {range.timeLabel}
        </span>
      </div>

      {isNationalView ? (
        <section aria-labelledby="ncda-kpis">
          <h2 id="ncda-kpis" className="sr-only">
            {ncda.overview.nationalPulse}
          </h2>
          {data.isBootstrapping ? (
            <Skeleton className="h-[4.5rem] w-full" rounded="xl" />
          ) : overviewError && networkError ? (
            <Card padding="md" className="border-border">
              <p className="text-body text-text-secondary">{ncda.dashboard.sectionError}</p>
              <Button
                type="button"
                variant="primary"
                className="mt-3"
                onClick={() => {
                  void dashboard.overview.refetch()
                  void dashboard.network.refetch()
                }}
              >
                {ncda.dashboard.retry}
              </Button>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden border-border">
              <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
                {data.kpis.map((kpi) => (
                  <CompactOverviewKpi key={kpi.key} kpi={kpi} />
                ))}
              </div>
            </Card>
          )}
        </section>
      ) : !centreId ? (
        <section aria-labelledby="ncda-district-pulse">
          <h2 id="ncda-district-pulse" className="sr-only">
            {ncda.overview.districtPulse}
          </h2>
          {districtSummary.isLoading && !districtSummary.data ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" rounded="xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PulseStat
                label={ncda.overview.panelChildren}
                value={districtSummary.data?.overview.children.active ?? ncda.dashboard.noRate}
                href={districtId ? ncdaDemographicsPath({ districtId }) : undefined}
              />
              <PulseStat
                label={ncda.overview.panelAttendance}
                value={formatRate(districtSummary.data?.overview.attendance.rate)}
              />
              <PulseStat
                label={ncda.overview.panelNutrition}
                value={districtSummary.data?.overview.nutrition.severe ?? ncda.dashboard.noRate}
                href={
                  districtId
                    ? ncdaNutritionAlertsPath({
                        districtId,
                        status: 'severe_nutrition',
                      })
                    : undefined
                }
              />
              <PulseStat
                label={ncda.dashboard.centers}
                value={
                  districtCenters.data?.total != null
                    ? `${filteredCenters.length} / ${districtCenters.data.total}`
                    : filteredCenters.length
                }
              />
            </div>
          )}
        </section>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setSearchOpen(value.trim().length >= 2)
            }}
            placeholder={ncda.overview.searchPlaceholder}
            onFocus={() => {
              if (search.trim().length >= 2) setSearchOpen(true)
            }}
          />
          {searchOpen && search.trim().length >= 2 ? (
            <div
              className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
              role="listbox"
            >
              {searchHits.districts.length === 0 &&
              searchHits.sectors.length === 0 &&
              searchHits.centers.length === 0 &&
              !nationalSearch.isFetching ? (
                <p className="px-3 py-3 text-caption text-text-secondary">
                  {ncda.overview.searchNoResults}
                </p>
              ) : (
                <>
                  {searchHits.districts.length > 0 ? (
                    <SearchGroup label={ncda.overview.searchDistricts}>
                      {searchHits.districts.map((d) => (
                        <SearchRow
                          key={d.id}
                          label={d.name}
                          meta={d.code}
                          onSelect={() => selectDistrict(d.id)}
                        />
                      ))}
                    </SearchGroup>
                  ) : null}
                  {searchHits.sectors.length > 0 ? (
                    <SearchGroup label={ncda.overview.searchSectors}>
                      {searchHits.sectors.map((s) => (
                        <SearchRow
                          key={s.id}
                          label={s.name}
                          meta={s.code}
                          onSelect={() => selectSector(s.id)}
                        />
                      ))}
                    </SearchGroup>
                  ) : null}
                  {searchHits.centers.length > 0 ? (
                    <SearchGroup label={ncda.overview.searchCenters}>
                      {searchHits.centers.map((c) => (
                        <SearchRow
                          key={c.id}
                          label={c.name}
                          meta={[c.districtName, c.villageName].filter(Boolean).join(' · ')}
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
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal size={16} aria-hidden />
            {ncda.overview.filters}
          </Button>
        </div>
      </div>

      {filtersOpen ? (
        <Card padding="md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-subheading font-semibold">{ncda.overview.filters}</h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStatus('all')
                if (districtId) patchParams({ sector: null, centre: null })
                else patchParams({ district: null, sector: null, centre: null })
              }}
            >
              {ncda.overview.clearFilters}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={ncda.overview.filterDistrict}>
              <SelectInput
                value={districtId}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) patchParams({ district: null, sector: null, centre: null })
                  else selectDistrict(value)
                }}
              >
                <option value="">{ncda.overview.filterAll}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label={ncda.overview.filterSector}>
              <SelectInput
                value={sectorId}
                onChange={(e) => selectSector(e.target.value)}
                disabled={!districtId}
              >
                <option value="">
                  {districtId ? ncda.overview.filterAll : ncda.overview.filterNeedsDistrict}
                </option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label={ncda.overview.filterStatus}>
              <SelectInput
                value={status}
                onChange={(e) => setStatus(e.target.value as 'all' | CenterStatus)}
                disabled={!districtId}
              >
                <option value="all">{ncda.overview.filterAll}</option>
                <option value={EcdCenterStatus.active}>{ncda.centers.statusActive}</option>
                <option value={EcdCenterStatus.inactive}>{ncda.centers.statusInactive}</option>
              </SelectInput>
            </FormField>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
          <Card padding="none" className="flex h-full min-h-[32rem] flex-col overflow-hidden lg:min-h-[40rem]">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-body font-semibold text-text">{ncda.overview.mapTitle}</h2>
                <p className="text-caption text-text-muted">{ncda.overview.mapHint}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ArcGisMapEmbed
                title={ncda.overview.mapTitle}
                fill
                minHeight="24rem"
                className="h-full rounded-none border-0"
              />
            </div>
          </Card>

          {centreId ? (
            <Card padding="md" className="h-full">
              <EntityPanel
                title={centerDetail.data?.name ?? ncda.overview.selectCenter}
                onClose={() => patchParams({ centre: null })}
              >
                {centerDetail.isError && !centerDetail.data ? (
                  <p className="text-caption text-text-secondary">{ncda.centers.detailError}</p>
                ) : centerDetail.isLoading && !centerDetail.data ? (
                  <Skeleton height="8rem" className="w-full" rounded="md" />
                ) : centerDetail.data ? (
                  <CenterPanelBody
                    center={centerDetail.data}
                    summary={centerSummary.data}
                    sectorName={
                      findSectorForVillage(
                        centerDetail.data.districtName ?? '',
                        centerDetail.data.villageName ?? '',
                      ) ?? null
                    }
                  />
                ) : null}
              </EntityPanel>
            </Card>
          ) : districtId ? (
            <Card padding="md" className="h-full">
              <EntityPanel
                title={selectedDistrict?.name ?? ncda.overview.selectDistrict}
                onClose={() => patchParams({ district: null, sector: null, centre: null })}
              >
                {districtDetail.isError && !districtDetail.data ? (
                  <p className="text-caption text-text-secondary">{ncda.districts.detailError}</p>
                ) : districtSummary.isLoading && !districtSummary.data ? (
                  <Skeleton height="8rem" className="w-full" rounded="md" />
                ) : (
                  <DistrictPanelBody
                    districtId={districtId}
                    districtCode={selectedDistrict?.code}
                    districtName={selectedDistrict?.name ?? '—'}
                    isActive={selectedDistrict?.isActive ?? true}
                    provinceKey={getProvinceKeyForDistrict(selectedDistrict?.name ?? '')}
                    summary={districtSummary.data}
                    centersShown={filteredCenters.length}
                    centersTotal={districtCenters.data?.total}
                    centers={filteredCenters}
                    onSelectCenter={selectCenter}
                  />
                )}
              </EntityPanel>
            </Card>
          ) : (
            <NationalSummaryPanel
              centers={network?.activeCenters}
              childrenCount={overview?.children.active}
              attendanceRate={overview?.attendance.rate}
              nutritionSevere={overview?.nutrition.severe}
              loading={data.isBootstrapping}
            />
          )}
        </div>
    </div>
  )
}

function PulseStat({
  label,
  value,
  href,
}: {
  label: string
  value: string | number
  href?: string
}) {
  const body = (
    <>
      <p className="text-caption font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-[1.25rem] font-bold tabular-nums text-text">{value}</p>
    </>
  )

  if (!href) {
    return (
      <Card padding="none" className="border-border px-4 py-3">
        {body}
      </Card>
    )
  }

  return (
    <Link
      to={href}
      className="block rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition-all duration-150 hover:border-primary/30 hover:shadow-md motion-reduce:transition-none"
      title={ncda.overview.drillDownHint}
    >
      {body}
    </Link>
  )
}

function compactTrendTextClass(kpi: { trend?: number; higherIsBetter: boolean }): string {
  if (kpi.trend == null || Math.abs(kpi.trend) < 0.05) return 'text-text-muted'
  const improved = kpi.higherIsBetter ? kpi.trend > 0 : kpi.trend < 0
  return improved ? 'text-success' : 'text-error'
}

function CompactOverviewKpi({ kpi }: { kpi: OverviewKpi }) {
  const display =
    kpi.value == null || kpi.status === 'unavailable' ? ncda.dashboard.noRate : kpi.value
  const href = kpiDrillDownHref(kpi)

  const body = (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${KPI_ICON_TONES[kpi.key]}`}
      >
        {KPI_ICONS[kpi.key]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.6875rem] font-medium text-text-secondary">{kpi.label}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-lg font-bold leading-none tabular-nums text-text">{display}</p>
          {kpi.trend != null && kpi.status !== 'unavailable' ? (
            <span
              className={`text-[0.6875rem] font-semibold tabular-nums ${compactTrendTextClass(kpi)}`}
            >
              {formatTrend(kpi.trend)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (!href) {
    return body
  }

  return (
    <Link
      to={href}
      className="block transition-colors hover:bg-surface-muted/60"
      title={ncda.overview.drillDownHint}
    >
      {body}
    </Link>
  )
}

function NationalSummaryPanel({
  centers,
  childrenCount,
  attendanceRate,
  nutritionSevere,
  loading,
}: {
  centers: number | null | undefined
  childrenCount: number | null | undefined
  attendanceRate: number | null | undefined
  nutritionSevere: number | null | undefined
  loading: boolean
}) {
  return (
    <Card padding="md" className="h-full">
      <h2 className="mb-3 text-body font-semibold text-text">{ncda.overview.nationalSummary}</h2>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" rounded="md" />
          ))}
        </div>
      ) : (
        <>
          <dl className="space-y-3">
            <SummaryRow
              label={ncda.dashboard.activeCenters}
              value={centers == null ? ncda.dashboard.noRate : centers.toLocaleString()}
              href={NCDA_PATHS.centers}
            />
            <SummaryRow
              label={ncda.overview.panelChildren}
              value={
                childrenCount == null ? ncda.dashboard.noRate : childrenCount.toLocaleString()
              }
              href={ncdaDemographicsPath()}
            />
            <SummaryRow
              label={ncda.overview.panelAttendance}
              value={formatRate(attendanceRate)}
            />
            <SummaryRow
              label={ncda.overview.panelNutrition}
              value={
                nutritionSevere == null
                  ? ncda.dashboard.noRate
                  : nutritionSevere.toLocaleString()
              }
              href={ncdaNutritionAlertsPath({ status: 'severe_nutrition' })}
            />
          </dl>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
            <Link
              to={ncdaDemographicsPath()}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {ncda.overview.viewChildren}
            </Link>
            <Link
              to={NCDA_PATHS.districts}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {ncda.dashboard.districts}
            </Link>
            <Link
              to={NCDA_PATHS.monitoring}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {ncda.overview.viewMonitoring}
            </Link>
          </div>
        </>
      )}
    </Card>
  )
}

function SearchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-muted">
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
      role="option"
      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-background-subtle"
      onClick={onSelect}
    >
      <span className="text-body font-medium text-text">{label}</span>
      {meta ? <span className="text-caption text-text-secondary">{meta}</span> : null}
    </button>
  )
}

function EntityPanel({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-subheading font-semibold text-text">{title}</h2>
        <button type="button" onClick={onClose} aria-label={common.close}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  href,
}: {
  label: string
  value: string | number
  href?: string
}) {
  const row = (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-0">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-body font-semibold tabular-nums text-text">{value}</span>
    </div>
  )

  if (!href) return row

  return (
    <Link
      to={href}
      className="block rounded-md transition-colors hover:bg-background-subtle"
      title={ncda.overview.drillDownHint}
    >
      {row}
    </Link>
  )
}

function DistrictPanelBody({
  districtId,
  districtCode,
  districtName,
  isActive,
  provinceKey,
  summary,
  centersShown,
  centersTotal,
  centers,
  onSelectCenter,
}: {
  districtId: string
  districtCode?: string
  districtName: string
  isActive: boolean
  provinceKey: string | null
  summary: ReturnType<typeof useNcdaDistrictSummary>['data']
  centersShown: number
  centersTotal?: number
  centers: Array<{
    id: string
    name: string
    code?: string
    villageName: string | null
    status: string
  }>
  onSelectCenter: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={isActive ? 'success' : 'neutral'}>
          {isActive ? ncda.overview.panelOperational : ncda.overview.panelInactive}
        </Badge>
        {provinceKey ? <Badge variant="info">{getProvinceDisplayName(provinceKey)}</Badge> : null}
      </div>
      <SummaryRow
        label={ncda.overview.panelChildren}
        value={summary?.overview.children.active ?? '—'}
        href={ncdaDemographicsPath({ districtId })}
      />
      <SummaryRow
        label={ncda.overview.panelAttendance}
        value={formatRate(summary?.overview.attendance.rate)}
      />
      <SummaryRow
        label={ncda.overview.panelNutrition}
        value={summary?.overview.nutrition.severe ?? '—'}
        href={ncdaNutritionAlertsPath({ districtId, status: 'severe_nutrition' })}
      />
      <SummaryRow
        label={ncda.overview.panelSted}
        value={summary?.kpis.kpis.stedAssessments ?? '—'}
      />
      <p className="text-caption text-text-muted">
        {ncda.overview.centersInView}: {centersShown}
        {centersTotal != null ? ` / ${centersTotal}` : ''}
      </p>
      {centers.length > 0 ? (
        <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {centers.slice(0, 12).map((center) => (
            <li key={center.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-background-subtle"
                onClick={() => onSelectCenter(center.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-caption font-semibold text-text">
                    {center.name}
                  </span>
                  <span className="block truncate text-caption text-text-secondary">
                    {center.villageName ?? '—'}
                  </span>
                </span>
                <ChevronDown size={14} className="-rotate-90 text-text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-text-secondary">{ncda.overview.noCenters}</p>
      )}
      <div className="flex flex-col gap-2">
        <Link
          to={buildDistrictDetailPath(NCDA_PATHS.districts, {
            id: districtId,
            code: districtCode,
          })}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {ncda.overview.viewDistrictProfile} →
        </Link>
        <Link
          to={`${NCDA_PATHS.monitoring}?district=${encodeURIComponent(districtCode || districtId)}`}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {ncda.overview.viewMonitoring}
        </Link>
      </div>
      <p className="sr-only">{districtName}</p>
    </div>
  )
}

function CenterPanelBody({
  center,
  summary,
  sectorName,
}: {
  center: NonNullable<ReturnType<typeof useNcdaCenterDetail>['data']>
  summary: ReturnType<typeof useNcdaCenterSummary>['data']
  sectorName: string | null
}) {
  return (
    <div className="space-y-3">
      <Badge variant={center.status === 'active' ? 'success' : 'neutral'}>
        {center.status === 'active' ? ncda.overview.panelOperational : ncda.overview.panelInactive}
      </Badge>
      <p className="text-caption text-text-secondary">
        {[center.districtName, sectorName, center.villageName].filter(Boolean).join(' · ')}
      </p>
      <SummaryRow label={ncda.overview.panelChildren} value={center.activeChildrenCount} />
      <SummaryRow
        label={ncda.overview.panelAttendance}
        value={formatRate(summary?.attendance.rate)}
      />
      <SummaryRow
        label={ncda.overview.panelNutrition}
        value={summary?.nutrition.severe ?? '—'}
      />
      <SummaryRow label={ncda.overview.panelCaregivers} value={center.caregiversCount ?? '—'} />
      <SummaryRow label={ncda.overview.panelCapacity} value={center.capacity ?? '—'} />
      <SummaryRow label={ncda.overview.panelPhone} value={center.phone ?? '—'} />
      <div className="flex flex-col gap-2 pt-1">
        <Link
          to={buildCenterDetailPath(NCDA_PATHS.centers, center)}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {ncda.overview.viewCenterProfile}
        </Link>
        <Link
          to={`${NCDA_PATHS.inspections}?center=${encodeURIComponent(center.id)}&district=${encodeURIComponent(center.districtId)}`}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {ncda.overview.viewInspections}
        </Link>
      </div>
    </div>
  )
}
