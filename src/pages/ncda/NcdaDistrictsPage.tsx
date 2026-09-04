import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPinned, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaDistrictsList,
  useNcdaDistrictsNetwork,
} from '@/features/ncda/districts/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { buildDistrictDetailPath } from '@/lib/entity-routes'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'

type StatusFilter = 'all' | 'active' | 'inactive'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso.slice(0, 10)
  }
}

/**
 * NCDA District Management — national governance directory.
 * Server-paginated GET /districts only; no national center/child hydration.
 */
export function NcdaDistrictsPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.districts.title}
          subtitle={ncda.districts.subtitle}
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

  return <NcdaDistrictsLive />
}

function NcdaDistrictsLive() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(search, 300)

  const isActive =
    status === 'all' ? undefined : status === 'active' ? true : false

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      isActive,
      page,
      pageSize,
    }),
    [debouncedSearch, isActive, page, pageSize],
  )

  const network = useNcdaDistrictsNetwork()
  const list = useNcdaDistrictsList(listFilters)

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  const hasFilters = Boolean(debouncedSearch.trim()) || status !== 'all'

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.districts.title}
        subtitle={ncda.districts.subtitle}
        size="compact"
        action={
          <Link
            to={NCDA_PATHS.dashboard}
            className="text-caption font-semibold text-primary hover:underline"
          >
            {ncda.overview.openOnMap}
          </Link>
        }
      />

      <PageContent>
        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.districts.networkTitle}
            isLoading={network.isLoading && !network.data && !network.isError}
            isError={network.isError && !network.data}
            onRetry={() => void network.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <StatCard
                label={ncda.districts.totalDistricts}
                value={network.data?.districts ?? '—'}
                icon={<MapPinned size={18} />}
              />
              <StatCard
                label={ncda.districts.activeDistricts}
                value={network.data?.activeDistricts ?? '—'}
                icon={<MapPinned size={18} />}
              />
            </div>
          </NcdaDashboardSection>

          <section className="space-y-3" aria-labelledby="ncda-districts-list">
            <h2 id="ncda-districts-list" className="text-subheading font-semibold text-text">
              {ncda.districts.listTitle}
            </h2>

            <Card padding="md" className="border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 max-w-md">
                  <label
                    htmlFor="ncda-district-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.districts.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="ncda-district-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder={ncda.districts.searchPlaceholder}
                      className="!pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="ncda-district-status"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.districts.statusFilter}
                  </label>
                  <SelectInput
                    id="ncda-district-status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.districts.statusAll}</option>
                    <option value="active">{ncda.districts.statusActive}</option>
                    <option value="inactive">{ncda.districts.statusInactive}</option>
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{ncda.districts.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {ncda.districts.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                  <span className="sr-only">{ncda.districts.loading}</span>
                </div>
              ) : items.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasFilters ? ncda.districts.emptyFiltered : ncda.districts.empty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[36rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colDistrict}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colCode}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colStatus}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.districts.colUpdated}</th>
                          <th className="py-2 font-semibold">{ncda.districts.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium text-text" data-label={ncda.districts.colDistrict}>{row.name}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colCode}>{row.code}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colStatus}>
                              {row.isActive
                                ? ncda.districts.statusActive
                                : ncda.districts.statusInactive}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.districts.colUpdated}>
                              {formatDate(row.updatedAt)}
                            </td>
                            <td className="py-2.5 td-actions" data-label={ncda.districts.colAction}>
                              <Link
                                to={buildDistrictDetailPath(NCDA_PATHS.districts, row)}
                                className="text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                              >
                                {ncda.districts.viewDetail}
                              </Link>
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
                    pageSizeSelectId="ncda-districts-page-size"
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
