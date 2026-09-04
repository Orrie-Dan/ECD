import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useDistrictCentersList,
  useDistrictCentersNetwork,
} from '@/features/district/centers/queries'
import { hasUsableCenterCoordinates } from '@/lib/center-coordinates'
import { buildDistrictMapCenterHref } from '@/lib/district-map-links'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { district } from '@/locales/rw/district'
import { buildCenterDetailPath } from '@/lib/entity-routes'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { EcdCenterStatus } from '@/api/generated/models'

type StatusFilter = 'all' | EcdCenterStatus

/**
 * District Ibigo — ECD center directory scoped to the officer's district.
 * Layout mirrors NCDA centers (search / status / table / pagination); no national filters.
 */
export function CentersPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={district.centers.title}
          subtitle={district.centers.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={district.centers.mockOnlyTitle}
            description={district.centers.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <DistrictCentersLive />
}

function DistrictCentersLive() {
  const { user } = useAuth()
  const districtId = user?.districtId?.trim() || undefined

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(search, 300)

  const listFilters = useMemo(
    () => ({
      districtId,
      search: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      page,
      pageSize,
    }),
    [districtId, debouncedSearch, status, page, pageSize],
  )

  const network = useDistrictCentersNetwork(districtId)
  const list = useDistrictCentersList(listFilters, Boolean(districtId))

  const total = list.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const items = list.data?.items ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  const hasFilters = Boolean(debouncedSearch.trim()) || status !== 'all'

  if (!districtId) {
    return (
      <PageContainer>
        <PageHeader
          title={district.centers.title}
          subtitle={district.centers.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={district.centers.title}
            description={district.centers.listError}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={district.centers.title}
        subtitle={district.centers.subtitle}
        size="compact"
        action={
          <Link
            to={DISTRICT_PATHS.gis}
            className="text-caption font-semibold text-primary hover:underline"
          >
            {district.centers.openMap}
          </Link>
        }
      />

      <PageContent>
        <div className="space-y-8">
          <section className="space-y-3" aria-labelledby="district-centers-network">
            <h2
              id="district-centers-network"
              className="text-subheading font-semibold text-text"
            >
              {district.centers.networkTitle}
            </h2>
            {network.isError && !network.data ? (
              <Card padding="md" className="border-border bg-background-subtle/40">
                <p className="text-body text-text-secondary">{district.centers.listError}</p>
                <div className="mt-3">
                  <Button type="button" variant="primary" onClick={() => void network.refetch()}>
                    {district.centers.retry}
                  </Button>
                </div>
              </Card>
            ) : network.isLoading && !network.data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" aria-busy="true">
                <Skeleton height="4.5rem" className="w-full" rounded="lg" />
                <Skeleton height="4.5rem" className="w-full" rounded="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <StatCard
                  label={district.centers.totalCenters}
                  value={network.data?.centers ?? '—'}
                  icon={<Building2 size={18} />}
                />
                <StatCard
                  label={district.centers.activeCenters}
                  value={network.data?.activeCenters ?? '—'}
                  icon={<Building2 size={18} />}
                />
              </div>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="district-centers-list">
            <h2 id="district-centers-list" className="text-subheading font-semibold text-text">
              {district.centers.listTitle}
            </h2>
            <p className="text-caption text-text-muted">{district.centers.scopeLabel}</p>

            <Card padding="md" className="border-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1 max-w-md">
                  <label
                    htmlFor="district-center-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {district.centers.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="district-center-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder={district.centers.searchPlaceholder}
                      className="!pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="district-center-status"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {district.centers.statusFilter}
                  </label>
                  <SelectInput
                    id="district-center-status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{district.centers.statusAll}</option>
                    <option value="active">{district.centers.statusActive}</option>
                    <option value="inactive">{district.centers.statusInactive}</option>
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{district.centers.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {district.centers.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                  <span className="sr-only">{district.centers.loading}</span>
                </div>
              ) : items.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasFilters ? district.centers.emptyFiltered : district.centers.empty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[44rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{district.centers.colCenter}</th>
                          <th className="py-2 pr-3 font-semibold">{district.centers.colCode}</th>
                          <th className="py-2 pr-3 font-semibold">{district.centers.colVillage}</th>
                          <th className="py-2 pr-3 font-semibold">{district.centers.colStatus}</th>
                          <th className="py-2 pr-3 font-semibold">{district.centers.colChildren}</th>
                          <th className="py-2 pr-3 font-semibold">{district.centers.colLocation}</th>
                          <th className="py-2 font-semibold">{district.centers.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => {
                          const canMap = hasUsableCenterCoordinates(row.latitude, row.longitude)
                          return (
                            <tr key={row.id} className="border-b border-border/70">
                              <td
                                className="py-2.5 pr-3 font-medium text-text"
                                data-label={district.centers.colCenter}
                              >
                                {row.name}
                              </td>
                              <td
                                className="py-2.5 pr-3 text-text-secondary"
                                data-label={district.centers.colCode}
                              >
                                {row.code}
                              </td>
                              <td
                                className="py-2.5 pr-3 text-text-secondary"
                                data-label={district.centers.colVillage}
                              >
                                {row.villageName ?? '—'}
                              </td>
                              <td
                                className="py-2.5 pr-3 text-text-secondary"
                                data-label={district.centers.colStatus}
                              >
                                {row.status === 'active'
                                  ? district.centers.statusActive
                                  : district.centers.statusInactive}
                              </td>
                              <td
                                className="py-2.5 pr-3 text-text-secondary"
                                data-label={district.centers.colChildren}
                              >
                                {row.activeChildrenCount}
                              </td>
                              <td
                                className="py-2.5 pr-3 td-actions"
                                data-label={district.centers.colLocation}
                              >
                                {canMap ? (
                                  <Link
                                    to={buildDistrictMapCenterHref(row)}
                                    className="inline-flex min-h-11 items-center text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                                  >
                                    {district.centers.viewOnMap}
                                  </Link>
                                ) : (
                                  <span className="text-text-muted">
                                    {district.centers.locationUnavailable}
                                  </span>
                                )}
                              </td>
                              <td
                                className="py-2.5 td-actions"
                                data-label={district.centers.colAction}
                              >
                                <Link
                                  to={buildCenterDetailPath(DISTRICT_PATHS.centers, row)}
                                  className="inline-flex min-h-11 items-center text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                                >
                                  {district.centers.viewDetail}
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
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
                    pageSizeSelectId="district-centers-page-size"
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
