import { useMemo, useState } from 'react'
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
  useNcdaWashCenterOptions,
  useNcdaWashDistrictOptions,
  useNcdaWashIndicatorDetail,
  useNcdaWashIndicators,
} from '@/features/ncda/wash/queries'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function yn(value: boolean): string {
  return value ? ncda.wash.yes : ncda.wash.no
}

/**
 * NCDA WASH — paginated indicator browser + detail.
 * National coverage KPIs remain Unavailable (no aggregate API).
 */
export function NcdaWashPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.wash.title}
          subtitle={ncda.wash.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.wash.mockOnlyTitle}
            description={ncda.wash.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaWashLive />
}

function NcdaWashLive() {
  const [districtId, setDistrictId] = useState('all')
  const [centerId, setCenterId] = useState('all')
  const [centerSearch, setCenterSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  const listFilters = useMemo(
    () => ({
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    [districtId, centerId, from, to, page, pageSize],
  )

  const districts = useNcdaWashDistrictOptions()
  const centers = useNcdaWashCenterOptions(
    districtId === 'all' ? undefined : districtId,
    debouncedCenterSearch,
    districtId !== 'all',
  )
  const list = useNcdaWashIndicators(listFilters)
  const detail = useNcdaWashIndicatorDetail(selectedId ?? undefined, Boolean(selectedId))

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const hasFilters =
    districtId !== 'all' || centerId !== 'all' || Boolean(from) || Boolean(to)

  return (
    <PageContainer>
      <PageHeader title={ncda.sections.wash.title} subtitle={ncda.wash.subtitle} size="compact" />
      <PageContent>
        <Card padding="md" className="mb-4 border-border space-y-4">
          <h2 className="text-subheading font-semibold text-text">{ncda.wash.listTitle}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.wash.districtFilter}
              </label>
              <SelectInput
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value)
                  setCenterId('all')
                  setPage(1)
                }}
              >
                <option value="all">{ncda.wash.districtAll}</option>
                {(districts.data?.items ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.wash.centerFilter}
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
                  {districtId === 'all' ? ncda.wash.centerNeedsDistrict : ncda.wash.centerAll}
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
                    placeholder={ncda.wash.centerSearchPlaceholder}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.wash.from}
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
                {ncda.wash.to}
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

          {list.isError && !list.data ? (
            <div className="space-y-3">
              <p className="text-body text-text-secondary">{ncda.wash.listError}</p>
              <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                {ncda.wash.retry}
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
              {hasFilters ? ncda.wash.emptyFiltered : ncda.wash.empty}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 sm:min-w-[44rem] text-left text-body responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary">
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colDate}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colCenter}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colWater}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colSanitation}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colHandwashing}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.wash.colWaste}</th>
                      <th className="py-2 font-semibold">{ncda.wash.colAction}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b border-border/70">
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colDate}>{formatDate(row.recordedDate)}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colCenter}>{row.centerName ?? '—'}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colWater}>{yn(row.waterSourceAvailable)}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colSanitation}>{yn(row.sanitationFacilityAvailable)}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colHandwashing}>{yn(row.handwashingFacilityAvailable)}</td>
                        <td className="py-2.5 pr-3" data-label={ncda.wash.colWaste}>{yn(row.wasteManagementAvailable)}</td>
                        <td className="py-2.5 td-actions" data-label={ncda.wash.colAction}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedId(row.id)}
                          >
                            {ncda.wash.viewDetail}
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
                pageSizeSelectId="ncda-wash-page-size"
              />
            </>
          )}
        </Card>

        {selectedId ? (
          <Card padding="md" className="border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-subheading font-semibold text-text">{ncda.wash.detailTitle}</h2>
              <Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>
                {ncda.wash.closeDetail}
              </Button>
            </div>
            {detail.isLoading && !detail.data ? (
              <Skeleton height="8rem" className="w-full" rounded="md" />
            ) : detail.isError && !detail.data ? (
              <div className="space-y-3">
                <p className="text-body text-text-secondary">{ncda.wash.detailError}</p>
                <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                  {ncda.wash.retry}
                </Button>
              </div>
            ) : detail.data ? (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-body">
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colCenter}</dt>
                  <dd>{detail.data.centerName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colDate}</dt>
                  <dd>{formatDate(detail.data.recordedDate)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colWater}</dt>
                  <dd>
                    {yn(detail.data.waterSourceAvailable)}
                    {detail.data.waterSourceType ? ` (${detail.data.waterSourceType})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colSanitation}</dt>
                  <dd>
                    {yn(detail.data.sanitationFacilityAvailable)}
                    {detail.data.latrineCount != null
                      ? ` · ${detail.data.latrineCount} latrines`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colHandwashing}</dt>
                  <dd>{yn(detail.data.handwashingFacilityAvailable)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-secondary">{ncda.wash.colWaste}</dt>
                  <dd>{yn(detail.data.wasteManagementAvailable)}</dd>
                </div>
                {detail.data.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-caption text-text-secondary">{ncda.wash.notes}</dt>
                    <dd>{detail.data.notes}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </Card>
        ) : null}
      </PageContent>
    </PageContainer>
  )
}
