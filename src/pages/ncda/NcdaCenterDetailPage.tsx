import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Baby,
  Building2,
  Ruler,
  UserCheck,
  Utensils,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { useAuth } from '@/contexts/AppContext'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { formatRecordedByLabel } from '@/lib/user-display'
import { env } from '@/config/env'
import { hasUsableCenterCoordinates } from '@/lib/center-coordinates'
import { effectiveRangeToMonitoringDates, roundPct } from '@/features/monitoring'
import {
  useNcdaCenterAttendance,
  useNcdaCenterChildren,
  useNcdaCenterDetail,
  useNcdaCenterFeeding,
  useNcdaCenterNutrition,
  useNcdaCenterSummary,
} from '@/features/ncda/centers/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { useResolvedCenterRoute } from '@/hooks/useResolvedEntityRoute'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }
const OPS_PAGE_SIZE = 10

type OpsSection =
  | 'overview'
  | 'children'
  | 'attendance'
  | 'nutrition'
  | 'feeding'
  | 'sted'
  | 'compliance'
  | 'wash'

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return ncda.centers.noRate
  return `${roundPct(rate)}%`
}

function formatIsoRange(from?: string, to?: string): string {
  if (!from || !to) return '—'
  return `${from.slice(0, 10)} → ${to.slice(0, 10)} (UTC)`
}

/**
 * NCDA center detail — identity + center-scoped aggregates + operational pages.
 * Every list uses server-side centerId filters; no national bulk hydration.
 */
export function NcdaCenterDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.centers.title}
          subtitle={ncda.centers.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.centers.mockOnlyTitle}
            description={ncda.centers.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaCenterDetailLive />
}

function NcdaCenterDetailLive() {
  const { centerId: routeParam = '' } = useParams<{ centerId: string }>()
  const { user } = useAuth()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [section, setSection] = useState<OpsSection>('overview')
  const [opsPage, setOpsPage] = useState(1)

  const resolved = useResolvedCenterRoute(routeParam, NCDA_PATHS.centers)
  const centerId = resolved.centerId ?? ''

  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )
  const dateFilters = useMemo(
    () => effectiveRangeToMonitoringDates(effectiveRange),
    [effectiveRange],
  )

  const detail = useNcdaCenterDetail(centerId, Boolean(centerId))
  const summary = useNcdaCenterSummary(centerId, dateFilters, Boolean(centerId))

  const childrenQ = useNcdaCenterChildren(
    centerId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'children' && Boolean(centerId),
  )
  const attendanceQ = useNcdaCenterAttendance(
    centerId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'attendance' && Boolean(centerId),
  )
  const nutritionQ = useNcdaCenterNutrition(
    centerId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'nutrition' && Boolean(centerId),
  )
  const feedingQ = useNcdaCenterFeeding(
    centerId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'feeding' && Boolean(centerId),
  )
  const childLabelsById = useMemo(
    () =>
      new Map(
        (childrenQ.data?.items ?? []).map((row) => [row.id, row.fullName || row.registrationNumber || '—']),
      ),
    [childrenQ.data?.items],
  )

  const backLink = (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to={NCDA_PATHS.centers}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
      >
        <ArrowLeft size={14} aria-hidden />
        {ncda.centers.backToList}
      </Link>
      <Link
        to={`${NCDA_PATHS.dashboard}?centre=${encodeURIComponent(centerId)}`}
        className="text-caption font-semibold text-primary hover:underline"
      >
        {ncda.overview.openOnMap}
      </Link>
    </div>
  )

  if ((resolved.isLoading && !centerId) || (detail.isLoading && !detail.data && centerId)) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.centers.title}
          subtitle={ncda.centers.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <Skeleton className="h-48 w-full" rounded="xl" />
        </PageContent>
      </PageContainer>
    )
  }

  if ((resolved.isError || (!resolved.isLoading && !centerId)) && !detail.data) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.centers.title}
          subtitle={ncda.centers.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={ncda.centers.notFound}
            description={ncda.centers.detailError}
          />
        </PageContent>
      </PageContainer>
    )
  }

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.centers.title}
          subtitle={ncda.centers.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={is404 ? ncda.centers.notFound : ncda.centers.detailError}
            description={ncda.centers.detailError}
            action={
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {ncda.centers.retry}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const title = detail.data?.name ?? ncda.sections.centers.title
  const overview = summary.data
  const periodLabel = formatIsoRange(overview?.from, overview?.to)

  const sectionButtons: { id: OpsSection; label: string }[] = [
    { id: 'overview', label: ncda.centers.sectionOverview },
    { id: 'children', label: ncda.centers.sectionChildren },
    { id: 'attendance', label: ncda.centers.sectionAttendance },
    { id: 'nutrition', label: ncda.centers.sectionNutrition },
    { id: 'feeding', label: ncda.centers.sectionFeeding },
    { id: 'sted', label: ncda.centers.sectionSted },
    { id: 'compliance', label: ncda.centers.sectionCompliance },
    { id: 'wash', label: ncda.centers.sectionWash },
  ]

  return (
    <PageContainer>
      <PageHeader title={title} subtitle={ncda.centers.detailSubtitle} size="compact" />

      <PageContent>
        <div className="mb-4 space-y-2">
          {backLink}
          {detail.data?.code ? (
            <p className="text-caption text-text-secondary">{detail.data.code}</p>
          ) : null}
        </div>

        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.centers.identityTitle}
            isLoading={detail.isLoading && !detail.data}
            isError={false}
          >
            {detail.data ? (
              <Card padding="md" className="border-border">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.colCenter}</dt>
                    <dd className="font-semibold text-text">{detail.data.name}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.colCode}</dt>
                    <dd className="font-semibold text-text">{detail.data.code}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.colDistrict}</dt>
                    <dd className="font-semibold text-text">
                      {detail.data.districtName ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.colStatus}</dt>
                    <dd className="font-semibold text-text">
                      {detail.data.status === 'active'
                        ? ncda.centers.statusActive
                        : ncda.centers.statusInactive}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.colVillage}</dt>
                    <dd className="text-text-secondary">{detail.data.villageName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.province}</dt>
                    <dd className="text-text-secondary">{detail.data.provinceName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.phone}</dt>
                    <dd className="text-text-secondary">{detail.data.phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.capacity}</dt>
                    <dd className="text-text-secondary">{detail.data.capacity ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.centers.location}</dt>
                    <dd className="text-body">
                      {hasUsableCenterCoordinates(
                        detail.data.latitude,
                        detail.data.longitude,
                      ) ? (
                        <Link
                          to={`${NCDA_PATHS.dashboard}?centre=${encodeURIComponent(detail.data.id)}`}
                          className="inline-flex min-h-11 items-center text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                        >
                          {ncda.centers.viewOnMap}
                        </Link>
                      ) : (
                        <span className="text-text-muted">{ncda.centers.locationUnavailable}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Card>
            ) : null}
          </NcdaDashboardSection>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label={ncda.centers.opsNav}>
            {sectionButtons.map((btn) => (
              <Button
                key={btn.id}
                type="button"
                variant={section === btn.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setSection(btn.id)
                  setOpsPage(1)
                }}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {section === 'overview' ? (
            <>
              <div className="space-y-2">
                <ChartPeriodFilter
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  className="max-w-xl"
                />
                <p className="text-caption text-text-secondary">
                  {ncda.centers.periodHint}: {effectiveRange.timeLabel}
                  {periodLabel !== '—' ? ` · ${periodLabel}` : ''}
                </p>
              </div>

              <NcdaDashboardSection
                title={ncda.centers.summaryTitle}
                isLoading={summary.isLoading && !summary.data && !summary.isError}
                isError={summary.isError && !summary.data}
                onRetry={() => void summary.refetch()}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <StatCard
                    label={ncda.centers.activeChildren}
                    value={overview?.children.active ?? detail.data?.activeChildrenCount ?? '—'}
                    icon={<Baby size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.caregivers}
                    value={detail.data?.caregiversCount ?? '—'}
                    icon={<Building2 size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.attendanceRate}
                    value={formatRate(overview?.attendance.rate)}
                    icon={<UserCheck size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.presentToday}
                    value={detail.data?.attendancePresentToday ?? '—'}
                    icon={<UserCheck size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.absentToday}
                    value={detail.data?.attendanceAbsentToday ?? '—'}
                    icon={<UserCheck size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.nutritionScreenings}
                    value={overview?.nutrition.screenings ?? '—'}
                    icon={<Ruler size={18} />}
                  />
                  <StatCard
                    label={ncda.centers.feedingDays}
                    value={overview?.feeding.daysRecorded ?? '—'}
                    icon={<Utensils size={18} />}
                  />
                </div>
              </NcdaDashboardSection>
            </>
          ) : null}

          {section === 'children' ? (
            <OpsTableSection
              title={ncda.centers.sectionChildren}
              query={childrenQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.centers.opsEmpty}
              error={ncda.centers.opsError}
              columns={[
                ncda.centers.opsColName,
                ncda.centers.opsColStatus,
                ncda.centers.opsColMeta,
              ]}
              rows={(childrenQ.data?.items ?? []).map((row) => [
                row.fullName || row.registrationNumber || '—',
                row.status,
                row.registrationNumber || '—',
              ])}
              total={childrenQ.data?.total ?? 0}
              totalPages={childrenQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'attendance' ? (
            <OpsTableSection
              title={ncda.centers.sectionAttendance}
              query={attendanceQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.centers.opsEmpty}
              error={ncda.centers.opsError}
              columns={[
                ncda.centers.opsColDate,
                ncda.centers.opsColAttendance,
                ncda.centers.opsColMeta,
              ]}
              rows={(attendanceQ.data?.items ?? []).map((row) => [
                row.date?.slice(0, 10) ?? '—',
                row.present ? ncda.centers.statusPresent : ncda.centers.statusAbsent,
                childLabelsById.get(row.childId ?? '') ?? '—',
              ])}
              total={attendanceQ.data?.total ?? 0}
              totalPages={attendanceQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'nutrition' ? (
            <OpsTableSection
              title={ncda.centers.sectionNutrition}
              query={nutritionQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.centers.opsEmpty}
              error={ncda.centers.opsError}
              columns={[
                ncda.centers.opsColDate,
                ncda.centers.opsColStatus,
                ncda.centers.opsColMeta,
              ]}
              rows={(nutritionQ.data?.items ?? []).map((row) => [
                row.screeningDate?.slice(0, 10) ?? '—',
                row.nutritionStatus ?? '—',
                childLabelsById.get(row.childId ?? '') ?? '—',
              ])}
              total={nutritionQ.data?.total ?? 0}
              totalPages={nutritionQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'feeding' ? (
            <OpsTableSection
              title={ncda.centers.sectionFeeding}
              query={feedingQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.centers.opsEmpty}
              error={ncda.centers.opsError}
              columns={[
                ncda.centers.opsColDate,
                ncda.centers.opsColMeta,
                ncda.centers.opsColStatus,
              ]}
              rows={(feedingQ.data?.items ?? []).map((row) => [
                row.date?.slice(0, 10) ?? '—',
                [
                  row.milkServed ? ncda.centers.feedingMilk : null,
                  row.porridgeServed ? ncda.centers.feedingPorridge : null,
                  row.balancedMealServed ? ncda.centers.feedingBalanced : null,
                ]
                  .filter(Boolean)
                  .join(', ') || '—',
                formatRecordedByLabel(row.recordedBy, user),
              ])}
              total={feedingQ.data?.total ?? 0}
              totalPages={feedingQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'sted' || section === 'compliance' || section === 'wash' ? (
            <Card padding="md" className="border-border">
              <h2 className="text-subheading font-semibold text-text mb-2">
                {section === 'sted'
                  ? ncda.centers.sectionSted
                  : section === 'compliance'
                    ? ncda.centers.sectionCompliance
                    : ncda.centers.sectionWash}
              </h2>
              <p className="text-body text-text-secondary">{ncda.centers.sectionUnavailable}</p>
            </Card>
          ) : null}
        </div>
      </PageContent>
    </PageContainer>
  )
}

type OpsQueryLike = {
  isLoading: boolean
  isError: boolean
  data?: unknown
  refetch: () => Promise<unknown>
}

function OpsTableSection({
  title,
  query,
  page,
  onPageChange,
  empty,
  error,
  columns,
  rows,
  total,
  totalPages,
}: {
  title: string
  query: OpsQueryLike
  page: number
  onPageChange: (page: number) => void
  empty: string
  error: string
  columns: string[]
  rows: string[][]
  total: number
  totalPages: number
}) {
  const startIndex = total === 0 ? 0 : (page - 1) * OPS_PAGE_SIZE + 1
  const endIndex = total === 0 ? 0 : Math.min(page * OPS_PAGE_SIZE, total)

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-subheading font-semibold text-text">{title}</h2>
      <Card padding="md" className="border-border">
        {query.isError && !query.data ? (
          <div className="space-y-3">
            <p className="text-body text-text-secondary">{error}</p>
            <Button type="button" variant="primary" onClick={() => void query.refetch()}>
              {ncda.centers.retry}
            </Button>
          </div>
        ) : query.isLoading && !query.data ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="2.5rem" className="w-full" rounded="md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-body text-text-secondary">{empty}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 sm:min-w-[28rem] text-left text-body responsive-table-cards">
                <thead>
                  <tr className="border-b border-border text-caption text-text-secondary">
                    {columns.map((col) => (
                      <th key={col} className="py-2 pr-3 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/70">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          data-label={columns[cIdx]}
                          className={`py-2.5 pr-3 ${cIdx === 0 ? 'font-medium text-text' : 'text-text-secondary'}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={OPS_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              hasPrevious={page > 1}
              hasNext={page < totalPages}
              onPageChange={onPageChange}
              onPageSizeChange={() => {
                /* Fixed ops page size — national-safe bounded reads. */
              }}
              pageSizeSelectId={`ncda-center-ops-${title.replace(/\s+/g, '-').toLowerCase()}`}
            />
          </>
        )}
      </Card>
    </section>
  )
}
