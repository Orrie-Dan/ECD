import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaComplianceAssessmentDetail,
  useNcdaComplianceAssessments,
  useNcdaComplianceCenterOptions,
  useNcdaComplianceDistrictOptions,
  useNcdaComplianceStandards,
} from '@/features/ncda/compliance/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { AssessmentStatus } from '@/api/generated/models'

type StatusFilter = 'all' | AssessmentStatus

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

/**
 * NCDA Compliance — paginated assessment browser + detail.
 * National KPIs / latest-per-center remain Unavailable (no aggregate API).
 */
export function NcdaCompliancePage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.inspections.title}
          subtitle={ncda.inspections.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.compliance.mockOnlyTitle}
            description={ncda.compliance.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaComplianceLive />
}

function NcdaComplianceLive() {
  const [params] = useSearchParams()
  const [districtId, setDistrictId] = useState(() => params.get('district')?.trim() || 'all')
  const [centerId, setCenterId] = useState(() => params.get('center')?.trim() || 'all')
  const [centerSearch, setCenterSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showStandards, setShowStandards] = useState(false)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  const listFilters = useMemo(
    () => ({
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
      status: status === 'all' ? undefined : status,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    [districtId, centerId, status, from, to, page, pageSize],
  )

  const districts = useNcdaComplianceDistrictOptions()
  const centers = useNcdaComplianceCenterOptions(
    districtId === 'all' ? undefined : districtId,
    debouncedCenterSearch,
    districtId !== 'all',
  )
  const list = useNcdaComplianceAssessments(listFilters)
  const detail = useNcdaComplianceAssessmentDetail(selectedId ?? undefined, Boolean(selectedId))
  const standards = useNcdaComplianceStandards(showStandards)
  const standardsById = useMemo(
    () => new Map((standards.data ?? []).map((item) => [item.id, item])),
    [standards.data],
  )

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const hasFilters =
    districtId !== 'all' ||
    centerId !== 'all' ||
    status !== 'all' ||
    Boolean(from) ||
    Boolean(to)

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.inspections.title}
        subtitle={ncda.inspections.subtitle}
        size="compact"
      />
      <PageContent>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={ncda.inspections.bucketsTitle}>
          {(
            [
              ['all', ncda.inspections.bucketAll],
              ['draft', ncda.inspections.bucketDraft],
              ['submitted', ncda.inspections.bucketSubmitted],
              ['verified', ncda.inspections.bucketVerified],
              ['rejected', ncda.inspections.bucketRejected],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={status === value ? 'primary' : 'secondary'}
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <Card padding="md" className="mb-4 border-border space-y-4">
          <h2 className="text-subheading font-semibold text-text">{ncda.compliance.listTitle}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.compliance.districtFilter}
              </label>
              <SelectInput
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value)
                  setCenterId('all')
                  setPage(1)
                }}
              >
                <option value="all">{ncda.compliance.districtAll}</option>
                {(districts.data?.items ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.compliance.centerFilter}
              </label>
              <SelectInput
                value={centerId}
                disabled={districtId === 'all'}
                onChange={(e) => {
                  setCenterId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">
                  {districtId === 'all'
                    ? ncda.compliance.centerNeedsDistrict
                    : ncda.compliance.centerAll}
                </option>
                {(centers.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
              {districtId !== 'all' ? (
                <div className="mt-2">
                  <TextInput
                    value={centerSearch}
                    onChange={(e) => setCenterSearch(e.target.value)}
                    placeholder={ncda.compliance.centerSearchPlaceholder}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.compliance.statusFilter}
              </label>
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter)
                  setPage(1)
                }}
              >
                <option value="all">{ncda.compliance.statusAll}</option>
                <option value="draft">draft</option>
                <option value="submitted">submitted</option>
                <option value="verified">verified</option>
                <option value="rejected">rejected</option>
              </SelectInput>
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.compliance.from}
              </label>
              <TextInput
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.compliance.to}
              </label>
              <TextInput
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowStandards((v) => !v)}
          >
            {showStandards ? ncda.compliance.hideStandards : ncda.compliance.showStandards}
          </Button>

          {list.isError && !list.data ? (
            <div className="space-y-3">
              <p className="text-body text-text-secondary">{ncda.compliance.listError}</p>
              <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                {ncda.compliance.retry}
              </Button>
            </div>
          ) : list.isLoading && !list.data ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-body text-text-secondary">
              {hasFilters ? ncda.compliance.emptyFiltered : ncda.compliance.empty}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 sm:min-w-[40rem] text-left text-body responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary">
                      <th className="py-2 pr-3 font-semibold">{ncda.compliance.colDate}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.compliance.colCenter}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.compliance.colType}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.compliance.colStatus}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.compliance.colClass}</th>
                      <th className="py-2 font-semibold">{ncda.compliance.colAction}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b border-border/70">
                        <td className="py-2.5 pr-3" data-label={ncda.compliance.colDate}>{formatDate(row.assessmentDate)}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.compliance.colCenter}>{row.centerName ?? '—'}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.compliance.colType}>{row.assessmentType}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.compliance.colStatus}>{row.status}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.compliance.colClass}>{row.overallClassification ?? '—'}</td>
                        <td className="py-2.5 td-actions" data-label={ncda.compliance.colAction}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedId(row.id)}
                          >
                            {ncda.compliance.viewDetail}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size as PageSizeOption)
                  setPage(1)
                }}
                pageSizeSelectId="ncda-compliance-page-size"
              />
            </>
          )}
        </Card>

        {showStandards ? (
          <Card padding="md" className="mb-4 border-border space-y-3">
            <h2 className="text-subheading font-semibold text-text">{ncda.compliance.standardsTitle}</h2>
            {standards.isError && !standards.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.compliance.standardsError}</p>
                <Button type="button" variant="primary" onClick={() => void standards.refetch()}>
                  {ncda.compliance.retry}
                </Button>
              </div>
            ) : standards.isLoading && !standards.data ? (
              <Skeleton height="4rem" className="w-full" rounded="md" />
            ) : (standards.data?.length ?? 0) === 0 ? (
              <p className="text-body text-text-secondary">{ncda.compliance.standardsEmpty}</p>
            ) : (
              <ul className="divide-y divide-border text-body">
                {(standards.data ?? []).map((s) => (
                  <li key={s.id} className="py-2">
                    <span className="font-medium">{s.code}</span>
                    <span className="text-text-secondary"> — {s.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {selectedId ? (
          <Card padding="md" className="border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-subheading font-semibold text-text">{ncda.compliance.detailTitle}</h2>
              <Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>
                {ncda.compliance.closeDetail}
              </Button>
            </div>
            {detail.isLoading && !detail.data ? (
              <Skeleton height="8rem" className="w-full" rounded="md" />
            ) : detail.isError && !detail.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.compliance.detailError}</p>
                <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                  {ncda.compliance.retry}
                </Button>
              </div>
            ) : detail.data ? (
              <>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-body">
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.compliance.colCenter}</dt>
                    <dd>{detail.data.centerName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.compliance.colDate}</dt>
                    <dd>{formatDate(detail.data.assessmentDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.compliance.colType}</dt>
                    <dd>{detail.data.assessmentType}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.compliance.colStatus}</dt>
                    <dd>{detail.data.status}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">{ncda.compliance.colClass}</dt>
                    <dd>{detail.data.overallClassification ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-secondary">
                      {ncda.compliance.standardsVersion}
                    </dt>
                    <dd>{detail.data.standardsVersion}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`${NCDA_PATHS.centers}/${detail.data.centerId}`}
                    className="text-caption font-semibold text-primary hover:underline"
                  >
                    {ncda.inspections.openCenter}
                  </Link>
                  <Link
                    to={`${NCDA_PATHS.dashboard}?centre=${encodeURIComponent(detail.data.centerId)}`}
                    className="text-caption font-semibold text-primary hover:underline"
                  >
                    {ncda.inspections.openOnMap}
                  </Link>
                </div>
                <p className="text-caption text-text-muted">{ncda.inspections.criticalHint}</p>
                <h3 className="text-body font-semibold">{ncda.compliance.itemsTitle}</h3>
                {(detail.data.items?.length ?? 0) === 0 ? (
                  <p className="text-caption text-text-secondary">{ncda.compliance.itemsEmpty}</p>
                ) : (
                  <ul className="divide-y divide-border text-body">
                    {detail.data.items.map((item) => (
                      <li key={item.id} className="py-2">
                        <span className="font-medium">
                          {standardsById.get(item.standardId)?.code ?? item.standardId}
                        </span>
                        <span className="text-text-secondary">
                          {standardsById.get(item.standardId)?.title
                            ? ` — ${standardsById.get(item.standardId)?.title}`
                            : ''}
                          {' '}
                          · {item.response}
                          {item.score != null ? ` · score ${item.score}` : ''}
                          {item.gapSeverity ? ` · gap ${item.gapSeverity}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </Card>
        ) : null}
      </PageContent>
    </PageContainer>
  )
}
