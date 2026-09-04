import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Baby,
  Building2,
  Ruler,
  Search,
  UserCheck,
  UserMinus,
  Utensils,
  ClipboardList,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import { effectiveRangeToMonitoringDates, roundPct } from '@/features/monitoring'
import {
  useNcdaDistrictCenters,
  useNcdaDistrictDetail,
  useNcdaDistrictSummary,
} from '@/features/ncda/districts/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { EcdCenterStatus } from '@/api/generated/models'
import { useResolvedDistrictRoute } from '@/hooks/useResolvedEntityRoute'
import { buildCenterDetailPath } from '@/lib/entity-routes'
import { getProvinceDisplayName, getProvinceKeyForDistrict } from '@/lib/rwanda-admin'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

type CenterStatusFilter = 'all' | EcdCenterStatus

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.districts.noRate
  return `${roundPct(rate)}%`
}

function formatIsoRange(from?: string, to?: string): string {
  if (!from || !to) return '—'
  return `${from.slice(0, 10)} → ${to.slice(0, 10)} (UTC)`
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso.slice(0, 10)
  }
}

/**
 * NCDA district detail — identity + scoped aggregates + paginated centers.
 * Does not load the national center dataset.
 */
export function NcdaDistrictDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.districts.title}
          subtitle={ncda.districts.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.districts.mockOnlyTitle}
            description={ncda.districts.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaDistrictDetailLive />
}

function NcdaDistrictDetailLive() {
  const { districtId: routeParam = '' } = useParams<{ districtId: string }>()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )
  const dateFilters = useMemo(
    () => effectiveRangeToMonitoringDates(effectiveRange),
    [effectiveRange],
  )

  const [centerSearch, setCenterSearch] = useState('')
  const [centerStatus, setCenterStatus] = useState<CenterStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  const resolved = useResolvedDistrictRoute(routeParam, NCDA_PATHS.districts)
  const districtId = resolved.districtId ?? ''

  const detail = useNcdaDistrictDetail(districtId, Boolean(districtId))
  const summary = useNcdaDistrictSummary(districtId, dateFilters, Boolean(districtId))
  const centers = useNcdaDistrictCenters(
    {
      districtId,
      search: debouncedCenterSearch.trim() || undefined,
      status: centerStatus === 'all' ? undefined : centerStatus,
      page,
      pageSize,
    },
    Boolean(districtId),
  )

  const backLink = (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to={NCDA_PATHS.districts}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
      >
        <ArrowLeft size={14} aria-hidden />
        {ncda.districts.backToList}
      </Link>
      <Link
        to={`${NCDA_PATHS.dashboard}?district=${encodeURIComponent(resolved.code || districtId)}`}
        className="text-caption font-semibold text-primary hover:underline"
      >
        {ncda.overview.openOnMap}
      </Link>
    </div>
  )

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.districts.title}
          subtitle={ncda.districts.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={is404 ? ncda.districts.notFound : ncda.districts.detailError}
            description={ncda.districts.detailError}
            action={
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {ncda.districts.retry}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const title = detail.data?.name ?? ncda.sections.districts.title
  const centerItems = centers.data?.items ?? []
  const centerTotal = centers.data?.total ?? 0
  const centerTotalPages = centers.data?.totalPages ?? 1
  const startIndex = centerTotal === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = centerTotal === 0 ? 0 : Math.min(page * pageSize, centerTotal)
  const hasCenterFilters =
    Boolean(debouncedCenterSearch.trim()) || centerStatus !== 'all'

  const overview = summary.data?.overview
  const kpis = summary.data?.kpis.kpis
  const periodLabel = formatIsoRange(
    overview?.from ?? summary.data?.kpis.from,
    overview?.to ?? summary.data?.kpis.to,
  )

  return (
    <PageContainer>
      <PageHeader title={title} subtitle={ncda.districts.detailSubtitle} size="compact" />

      <PageContent>
        <div className="mb-4 space-y-2">
          {backLink}
          {detail.data?.code ? (
            <p className="text-caption text-text-secondary">{detail.data.code}</p>
          ) : null}
        </div>

        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.districts.identityTitle}
            isLoading={detail.isLoading && !detail.data}
            isError={false}
          >
            {detail.data ? (
              <Card padding="md" className="border-border">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.districts.colDistrict}</dt>
                    <dd className="font-semibold text-text">{detail.data.name}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.districts.colCode}</dt>
                    <dd className="font-semibold text-text">{detail.data.code}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.districts.colStatus}</dt>
                    <dd className="font-semibold text-text">
                      {detail.data.isActive
                        ? ncda.districts.statusActive
                        : ncda.districts.statusInactive}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.districts.province}</dt>
                    <dd className="font-semibold text-text">
                      {(() => {
                        const provinceKey = getProvinceKeyForDistrict(detail.data.name)
                        return provinceKey ? getProvinceDisplayName(provinceKey) : '—'
                      })()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.districts.colUpdated}</dt>
                    <dd className="text-text-secondary">{formatDate(detail.data.updatedAt)}</dd>
                  </div>
                </dl>
              </Card>
            ) : null}
          </NcdaDashboardSection>

          <div className="space-y-2">
            <ChartPeriodFilter
              value={periodFilter}
              onChange={setPeriodFilter}
              className="max-w-xl"
            />
            <p className="text-caption text-text-secondary">
              {ncda.districts.periodHint}: {effectiveRange.timeLabel}
              {periodLabel !== '—' ? ` · ${periodLabel}` : ''}
            </p>
          </div>

          <NcdaDashboardSection
            title={ncda.districts.summaryTitle}
            isLoading={summary.isLoading && !summary.data && !summary.isError}
            isError={summary.isError && !summary.data}
            onRetry={() => void summary.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                label={ncda.districts.centersInDistrict}
                value={summary.data?.centersTotal ?? '—'}
                icon={<Building2 size={18} />}
              />
              <StatCard
                label={ncda.districts.activeCenters}
                value={summary.data?.activeCenters ?? '—'}
                icon={<Building2 size={18} />}
              />
              <StatCard
                label={ncda.districts.activeChildren}
                value={overview?.children.active ?? '—'}
                icon={<Baby size={18} />}
              />
              <StatCard
                label={ncda.districts.childrenTotal}
                value={overview?.children.total ?? '—'}
                icon={<Baby size={18} />}
              />
              <StatCard
                label={ncda.districts.attendanceRate}
                value={formatRate(overview?.attendance.rate)}
                icon={<UserCheck size={18} />}
              />
              <StatCard
                label={ncda.districts.nutritionScreenings}
                value={overview?.nutrition.screenings ?? '—'}
                icon={<Ruler size={18} />}
              />
              <StatCard
                label={ncda.districts.feedingDays}
                value={overview?.feeding.daysRecorded ?? '—'}
                icon={<Utensils size={18} />}
              />
              <StatCard
                label={ncda.districts.stedAssessments}
                value={kpis?.stedAssessments ?? '—'}
                icon={<ClipboardList size={18} />}
              />
              <StatCard
                label={ncda.districts.newRegistrations}
                value={kpis?.newRegistrations ?? '—'}
                icon={<UserCheck size={18} />}
              />
              <StatCard
                label={ncda.districts.dropouts}
                value={kpis?.dropouts ?? '—'}
                icon={<UserMinus size={18} />}
              />
            </div>
          </NcdaDashboardSection>

          <section className="space-y-3" aria-labelledby="ncda-district-centers">
            <h2 id="ncda-district-centers" className="text-subheading font-semibold text-text">
              {ncda.districts.centersTitle}
            </h2>

            <Card padding="md" className="border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 max-w-md">
                  <label
                    htmlFor="ncda-district-center-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.districts.centersSearchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="ncda-district-center-search"
                      value={centerSearch}
                      onChange={(e) => {
                        setCenterSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder={ncda.districts.centersSearchPlaceholder}
                      className="!pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="ncda-district-center-status"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.districts.centerStatus}
                  </label>
                  <SelectInput
                    id="ncda-district-center-status"
                    value={centerStatus}
                    onChange={(e) => {
                      setCenterStatus(e.target.value as CenterStatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.districts.statusAll}</option>
                    <option value="active">{ncda.districts.statusActive}</option>
                    <option value="inactive">{ncda.districts.statusInactive}</option>
                  </SelectInput>
                </div>
              </div>

              {centers.isError && !centers.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{ncda.districts.centersError}</p>
                  <Button type="button" variant="primary" onClick={() => void centers.refetch()}>
                    {ncda.districts.retry}
                  </Button>
                </div>
              ) : centers.isLoading && !centers.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                </div>
              ) : centerItems.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasCenterFilters
                    ? ncda.districts.centersEmptyFiltered
                    : ncda.districts.centersEmpty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[40rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colCenter}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colCode}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colVillage}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colStatus}</th>
                          <th className="py-2 font-semibold">{ncda.districts.colChildren}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {centerItems.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium text-text" data-label={ncda.districts.colCenter}>
                              <Link
                                to={buildCenterDetailPath(NCDA_PATHS.centers, row)}
                                className="text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colCode}>{row.code}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colVillage}>
                              {row.villageName ?? '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colStatus}>
                              {row.status === 'active'
                                ? ncda.districts.statusActive
                                : ncda.districts.statusInactive}
                            </td>
                            <td className="py-2.5 text-text-secondary" data-label={ncda.districts.colChildren}>
                              {row.activeChildrenCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={centerTotal}
                    totalPages={centerTotalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    hasPrevious={page > 1}
                    hasNext={page < centerTotalPages}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size as PageSizeOption)
                      setPage(1)
                    }}
                    pageSizeSelectId="ncda-district-centers-page-size"
                  />
                </>
              )}
            </Card>
          </section>
        </div>
      </PageContent>
    </PageContainer>
  )
}
