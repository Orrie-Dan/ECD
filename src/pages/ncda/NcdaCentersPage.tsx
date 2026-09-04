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
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaCenterDistrictOptions,
  useNcdaCentersList,
  useNcdaCentersNetwork,
} from '@/features/ncda/centers/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { buildCenterDetailPath } from '@/lib/entity-routes'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { EcdCenterStatus } from '@/api/generated/models'

type StatusFilter = 'all' | EcdCenterStatus

/**
 * NCDA Centers Management — national governance directory.
 * Server-paginated GET /centers only; never loads all ~39k centers client-side.
 */
export function NcdaCentersPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.centers.title}
          subtitle={ncda.centers.subtitle}
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

  return <NcdaCentersLive />
}

function NcdaCentersLive() {
  const [search, setSearch] = useState('')
  const [districtId, setDistrictId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(search, 300)

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      districtId: districtId === 'all' ? undefined : districtId,
      status: status === 'all' ? undefined : status,
      page,
      pageSize,
    }),
    [debouncedSearch, districtId, status, page, pageSize],
  )

  const network = useNcdaCentersNetwork()
  const districts = useNcdaCenterDistrictOptions()
  const list = useNcdaCentersList(listFilters)

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  const hasFilters =
    Boolean(debouncedSearch.trim()) || districtId !== 'all' || status !== 'all'

  const districtOptions = districts.data?.items ?? []

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.centers.title}
        subtitle={ncda.centers.subtitle}
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
            title={ncda.centers.networkTitle}
            isLoading={network.isLoading && !network.data && !network.isError}
            isError={network.isError && !network.data}
            onRetry={() => void network.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <StatCard
                label={ncda.centers.totalCenters}
                value={network.data?.centers ?? '—'}
                icon={<Building2 size={18} />}
              />
              <StatCard
                label={ncda.centers.activeCenters}
                value={network.data?.activeCenters ?? '—'}
                icon={<Building2 size={18} />}
              />
            </div>
          </NcdaDashboardSection>

          <section className="space-y-3" aria-labelledby="ncda-centers-list">
            <h2 id="ncda-centers-list" className="text-subheading font-semibold text-text">
              {ncda.centers.listTitle}
            </h2>

            <Card padding="md" className="border-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1 max-w-md">
                  <label
                    htmlFor="ncda-center-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.centers.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="ncda-center-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder={ncda.centers.searchPlaceholder}
                      className="!pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-56">
                  <label
                    htmlFor="ncda-center-district"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.centers.districtFilter}
                  </label>
                  <SelectInput
                    id="ncda-center-district"
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value)
                      setPage(1)
                    }}
                    disabled={districts.isLoading && !districts.data}
                  >
                    <option value="all">{ncda.centers.districtAll}</option>
                    {districtOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="ncda-center-status"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.centers.statusFilter}
                  </label>
                  <SelectInput
                    id="ncda-center-status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.centers.statusAll}</option>
                    <option value="active">{ncda.centers.statusActive}</option>
                    <option value="inactive">{ncda.centers.statusInactive}</option>
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{ncda.centers.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {ncda.centers.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                  <span className="sr-only">{ncda.centers.loading}</span>
                </div>
              ) : items.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasFilters ? ncda.centers.emptyFiltered : ncda.centers.empty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[44rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colCenter}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colCode}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colDistrict}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colVillage}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colStatus}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.centers.colChildren}</th>
                          <th className="py-2 font-semibold">{ncda.centers.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium text-text" data-label={ncda.centers.colCenter}>{row.name}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.centers.colCode}>{row.code}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.centers.colDistrict}>
                              {row.districtName ?? '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.centers.colVillage}>
                              {row.villageName ?? '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.centers.colStatus}>
                              {row.status === 'active'
                                ? ncda.centers.statusActive
                                : ncda.centers.statusInactive}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.centers.colChildren}>
                              {row.activeChildrenCount}
                            </td>
                            <td className="py-2.5 td-actions" data-label={ncda.centers.colAction}>
                              <Link
                                to={buildCenterDetailPath(NCDA_PATHS.centers, row)}
                                className="text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                              >
                                {ncda.centers.viewDetail}
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
                    pageSizeSelectId="ncda-centers-page-size"
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
