import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/SearchInput'
import { SelectInput } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import { roundPct } from '@/features/monitoring'
import { useDebounce } from '@/hooks/useDebounce'
import { useNcdaDashboard } from '@/features/ncda/dashboard/useNcdaDashboard'
import { NCDA_UNSUPPORTED_METRICS } from '@/features/ncda/dashboard/definitions'
import {
  useNcdaCenterDetail,
  useNcdaCenterSummary,
} from '@/features/ncda/centers/queries'
import { useNcdaDistrictDetail, useNcdaDistrictSummary } from '@/features/ncda/districts/queries'
import { useNcdaMonitoringSted } from '@/features/ncda/monitoring/queries'
import {
  useNcdaOverviewAdminUnits,
  useNcdaOverviewCenters,
  useNcdaOverviewDistricts,
} from '@/features/ncda/overview/queries'
import { buildNcdaMapLayers } from '@/features/ncda/overview/layers'
import { findSectorForVillage, getProvinceDisplayName, getProvinceKeyForDistrict } from '@/lib/rwanda-admin'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { EcdCenterStatus, type EcdCenterStatus as CenterStatus } from '@/api/generated/models'
import { GisPendingPlaceholder } from '@/components/gis/GisPendingPlaceholder'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.dashboard.noRate
  return `${roundPct(rate)}%`
}

export function NcdaOverviewCommand() {
  const [params, setParams] = useSearchParams()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | CenterStatus>('all')
  const [layers, setLayers] = useState(buildNcdaMapLayers)
  const [layersOpen, setLayersOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const districtId = params.get('district')?.trim() || ''
  const sectorId = params.get('sector')?.trim() || ''
  const centreId = params.get('centre')?.trim() || ''
  const debouncedSearch = useDebounce(search, 300)
  const range = useMemo(() => resolveEffectiveDateRange(periodFilter), [periodFilter])
  const dateFilters = useMemo(() => effectiveRangeToMonitoringDates(range), [range])

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

  const dashboard = useNcdaDashboard(range)
  const districtsQuery = useNcdaOverviewDistricts()
  const sted = useNcdaMonitoringSted(
    { ...dateFilters, page: 1, pageSize: 100 },
    true,
  )
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

  const districts = districtsQuery.data?.items ?? []
  const selectedDistrict = districts.find((d) => d.id === districtId) ?? districtDetail.data ?? null
  const sectors = sectorsQuery.data ?? []
  const selectedSector = sectors.find((s) => s.id === sectorId) ?? null
  const attentionDistrictIds = useMemo(() => {
    const items = (sted.data?.items ?? []).filter((row) => row.districtId)
    if (items.length === 0) return new Set<string>()
    const ranked = [...items].sort((a, b) => {
      const aVal = a.childrenAssessed != null && sted.data?.summary ? (a.assessmentsCompleted ?? 0) : (a.averageScore ?? 0)
      const bVal = b.childrenAssessed != null && sted.data?.summary ? (b.assessmentsCompleted ?? 0) : (b.averageScore ?? 0)
      const aCov = a.childrenAssessed ? a.assessmentsCompleted / Math.max(a.childrenAssessed, 1) : aVal
      const bCov = b.childrenAssessed ? b.assessmentsCompleted / Math.max(b.childrenAssessed, 1) : bVal
      return aCov - bCov
    })
    return new Set(ranked.slice(0, 5).map((row) => row.districtId!).filter(Boolean))
  }, [sted.data])

  const stedAttention = useMemo(() => {
    return (sted.data?.items ?? [])
      .filter((row) => row.districtId && attentionDistrictIds.has(row.districtId))
      .slice(0, 5)
  }, [sted.data, attentionDistrictIds])

  const rawCenters = districtId
    ? (districtCenters.data?.items ?? [])
    : []

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
      districts: districts.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)).slice(0, 6),
      sectors: sectors.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)).slice(0, 6),
      centers: districtId
        ? rawCenters
            .filter((c) =>
              `${c.name} ${c.code} ${c.villageName ?? ''}`.toLowerCase().includes(q),
            )
            .slice(0, 6)
        : (nationalSearch.data?.items ?? []),
    }
  }, [search, districts, sectors, rawCenters, districtId, nationalSearch.data?.items])

  const inactiveDistricts = districts.filter((d) => !d.isActive)
  const centersWithoutCoords = filteredCenters.filter((c) => c.latitude == null || c.longitude == null).length
  const overview = dashboard.overview.data
  const network = dashboard.network.data

  const selectDistrict = (id: string) => {
    setSearch('')
    setSearchOpen(false)
    patchParams({ district: id, sector: null, centre: null })
  }

  const selectSector = (id: string) => {
    patchParams({ sector: id, centre: null })
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
          <ChartPeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            className="w-full md:max-w-md"
          />
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
          {ncda.overview.country} · {ncda.overview.year} · {ncda.overview.periodLabel}: {range.timeLabel}
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
            placeholder={ncda.overview.searchPlaceholder}
            onFocus={() => {
              if (search.trim().length >= 2) setSearchOpen(true)
            }}
          />
          {searchOpen && search.trim().length >= 2 ? (
            <div
              className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-80 overflow-y-auto"
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
            onClick={() => {
              setLayersOpen((open) => !open)
              setFiltersOpen(false)
            }}
          >
            <Layers size={16} aria-hidden />
            {ncda.overview.layers}
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
            {ncda.overview.filters}
          </Button>
        </div>
      </div>

      {layersOpen ? (
        <Card padding="md" className="border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-subheading font-semibold">{ncda.overview.layers}</h2>
            <button type="button" onClick={() => setLayersOpen(false)} aria-label={ncda.overview.clearFilters}>
              <X size={16} />
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
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
                        {ncda.overview.layerUnavailable}
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
        <Card padding="md" className="border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-subheading font-semibold">{ncda.overview.filters}</h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStatus('all')
                patchParams({ district: null, sector: null, centre: null })
              }}
            >
              {ncda.overview.clearFilters}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-caption font-semibold text-text-secondary">
              {ncda.overview.filterDistrict}
              <SelectInput
                className="mt-1"
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
            </label>
            <label className="block text-caption font-semibold text-text-secondary">
              {ncda.overview.filterSector}
              <SelectInput
                className="mt-1"
                value={sectorId}
                disabled={!districtId}
                onChange={(e) => selectSector(e.target.value)}
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
            </label>
            <label className="block text-caption font-semibold text-text-secondary">
              {ncda.overview.filterStatus}
              <SelectInput
                className="mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'all' | CenterStatus)}
              >
                <option value="all">{ncda.overview.filterAll}</option>
                <option value={EcdCenterStatus.active}>{ncda.centers.statusActive}</option>
                <option value={EcdCenterStatus.inactive}>{ncda.centers.statusInactive}</option>
              </SelectInput>
            </label>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-stretch">
        <Card padding="none" elevated={false} className="border-border overflow-hidden min-h-[32rem]">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface">
            <div>
              <p className="text-body font-semibold text-text">{ncda.overview.mapTitle}</p>
              <p className="text-caption text-text-muted">{ncda.overview.mapHint}</p>
            </div>
            {districtId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => patchParams({ district: null, sector: null, centre: null })}
              >
                {ncda.overview.zoomOut}
              </Button>
            ) : null}
          </div>
          <GisPendingPlaceholder className="m-4 min-h-[22rem]" />
        </Card>

        <aside className="space-y-3 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
          {centreId ? (
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
          ) : districtId ? (
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
                  districtName={selectedDistrict?.name ?? '—'}
                  isActive={selectedDistrict?.isActive ?? true}
                  provinceKey={getProvinceKeyForDistrict(selectedDistrict?.name ?? '')}
                  summary={districtSummary.data}
                  centersShown={filteredCenters.length}
                  centersTotal={districtCenters.data?.total}
                  withoutCoords={centersWithoutCoords}
                  centers={filteredCenters}
                  onSelectCenter={selectCenter}
                />
              )}
            </EntityPanel>
          ) : (
            <Card padding="md" className="border-border space-y-3">
              <h2 className="text-subheading font-semibold text-text">
                {ncda.overview.nationalSummary}
              </h2>
              <SummaryRow label={ncda.dashboard.districts} value={network?.districts ?? '—'} />
              <SummaryRow
                label={ncda.dashboard.centers}
                value={overview?.centersInScope ?? '—'}
              />
              <SummaryRow
                label={ncda.dashboard.activeCenters}
                value={network?.activeCenters ?? '—'}
              />
              <SummaryRow
                label={ncda.dashboard.activeChildren}
                value={overview?.children.active ?? '—'}
              />
              <SummaryRow
                label={ncda.dashboard.attendanceRate}
                value={formatRate(overview?.attendance.rate)}
              />
              <p className="text-caption text-text-muted">{ncda.overview.selectDistrict}</p>
            </Card>
          )}
        </aside>
      </div>

      <section className="space-y-3" aria-labelledby="ncda-priority">
        <h2 id="ncda-priority" className="text-subheading font-semibold text-text">
          {ncda.overview.priorityInsights}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <InsightChip
            label={ncda.overview.inactiveDistricts}
            value={inactiveDistricts.length}
            tone={inactiveDistricts.length > 0 ? 'warning' : 'neutral'}
          />
          <InsightChip
            label={ncda.overview.severeNutrition}
            value={overview?.nutrition.severe ?? '—'}
            tone="danger"
          />
        </div>
        <details className="rounded-lg border border-border bg-surface px-4 py-3">
          <summary className="cursor-pointer text-body font-semibold text-text">
            {ncda.dashboard.unavailableTitle}
          </summary>
          <p className="mt-2 text-caption text-text-secondary">{ncda.dashboard.unavailableIntro}</p>
          <p className="mt-2 text-caption text-text-muted">{ncda.dashboard.trendsUnavailable}</p>
          <ul className="mt-2 list-disc pl-5 text-caption text-text-secondary space-y-1">
            {NCDA_UNSUPPORTED_METRICS.map((metric) => (
              <li key={metric.id}>
                <span className="font-medium">{metric.name}</span>: {metric.unavailableReason}
              </li>
            ))}
          </ul>
        </details>

        {stedAttention.length > 0 ? (
          <Card padding="md" className="border-border">
            <p className="text-body font-semibold text-text">{ncda.overview.stedAttention}</p>
            <p className="text-caption text-text-muted mb-2">{ncda.overview.stedAttentionHint}</p>
            <ul className="divide-y divide-border">
              {stedAttention.map((row) => (
                <li key={row.districtId} className="flex items-center justify-between py-2 gap-3">
                  <button
                    type="button"
                    className="text-left font-medium text-primary hover:underline"
                    onClick={() => row.districtId && selectDistrict(row.districtId)}
                  >
                    {row.districtName ?? row.districtId}
                  </button>
                  <span className="text-caption tabular-nums text-text-secondary">
                    {ncda.monitoring.stedCoverage}:{' '}
                    {row.childrenAssessed
                      ? formatRate(row.assessmentsCompleted / Math.max(row.childrenAssessed, 1))
                      : ncda.overview.stedNoScore}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="text-caption text-text-secondary">{ncda.overview.noPriority}</p>
        )}
      </section>
    </div>
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
    <Card padding="md" className="border-border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-subheading font-semibold text-text">{title}</h2>
        <button type="button" onClick={onClose} aria-label={ncda.overview.zoomOut}>
          <X size={16} />
        </button>
      </div>
      {children}
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-0">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-body font-semibold tabular-nums text-text">{value}</span>
    </div>
  )
}

function InsightChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: 'warning' | 'danger' | 'neutral'
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-error/40 bg-error-light/40'
      : tone === 'warning'
        ? 'border-warning/40 bg-warning-light/40'
        : 'border-border bg-surface'
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${toneClass}`}>
      <p className="text-caption text-text-secondary">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-heading font-semibold tabular-nums text-text">
        {tone !== 'neutral' ? <AlertTriangle size={16} aria-hidden /> : null}
        {value}
      </p>
    </div>
  )
}

function DistrictPanelBody({
  districtId,
  districtName,
  isActive,
  provinceKey,
  summary,
  centersShown,
  centersTotal,
  withoutCoords,
  centers,
  onSelectCenter,
}: {
  districtId: string
  districtName: string
  isActive: boolean
  provinceKey: string | null
  summary: ReturnType<typeof useNcdaDistrictSummary>['data']
  centersShown: number
  centersTotal?: number
  withoutCoords: number
  centers: Array<{ id: string; name: string; villageName: string | null; status: string }>
  onSelectCenter: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={isActive ? 'success' : 'neutral'}>
          {isActive ? ncda.overview.panelOperational : ncda.overview.panelInactive}
        </Badge>
        {provinceKey ? (
          <Badge variant="info">{getProvinceDisplayName(provinceKey)}</Badge>
        ) : null}
      </div>
      <SummaryRow
        label={ncda.overview.panelChildren}
        value={summary?.overview.children.active ?? '—'}
      />
      <SummaryRow
        label={ncda.overview.panelAttendance}
        value={formatRate(summary?.overview.attendance.rate)}
      />
      <SummaryRow
        label={ncda.overview.panelNutrition}
        value={summary?.overview.nutrition.severe ?? '—'}
      />
      <SummaryRow
        label={ncda.overview.panelSted}
        value={summary?.kpis.kpis.stedAssessments ?? '—'}
      />
      <p className="text-caption text-text-muted">
        {ncda.overview.centersInView}: {centersShown}
        {centersTotal != null ? ` / ${centersTotal}` : ''}
        {centersTotal != null && centersTotal > 100 ? ` · ${ncda.overview.centersCapped}` : ''}
        {withoutCoords > 0 ? ` · ${ncda.overview.centersWithoutCoords}: ${withoutCoords}` : ''}
      </p>
      {centers.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto divide-y divide-border rounded-md border border-border">
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
          to={`${NCDA_PATHS.districts}/${districtId}`}
          className="text-caption font-semibold text-primary hover:underline"
        >
          {ncda.overview.viewDistrictProfile}
        </Link>
        <Link
          to={`${NCDA_PATHS.monitoring}?district=${encodeURIComponent(districtId)}`}
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
      <SummaryRow
        label={ncda.overview.panelCoords}
        value={
          center.latitude != null && center.longitude != null
            ? `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`
            : '—'
        }
      />
      <div className="flex flex-col gap-2 pt-1">
        <Link
          to={`${NCDA_PATHS.centers}/${center.id}`}
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
