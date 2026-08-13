import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Baby, Search } from 'lucide-react'
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
  useNcdaChildCenterOptions,
  useNcdaChildDistrictOptions,
  useNcdaChildrenList,
  useNcdaChildrenNetwork,
} from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type ChildStatus, type PageSizeOption } from '@/types'

type StatusFilter = 'all' | ChildStatus

/**
 * NCDA Children Management — national oversight directory.
 * Server-paginated GET /children only; never hydrates the national child set.
 */
export function NcdaChildrenPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.children.title}
          subtitle={ncda.children.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.children.mockOnlyTitle}
            description={ncda.children.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaChildrenLive />
}

function NcdaChildrenLive() {
  const [search, setSearch] = useState('')
  const [districtId, setDistrictId] = useState('all')
  const [centerId, setCenterId] = useState('all')
  const [centerSearch, setCenterSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(search, 300)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
      status: status === 'all' ? undefined : status,
      page,
      pageSize,
    }),
    [debouncedSearch, districtId, centerId, status, page, pageSize],
  )

  const network = useNcdaChildrenNetwork()
  const districts = useNcdaChildDistrictOptions()
  const centers = useNcdaChildCenterOptions(
    districtId === 'all' ? undefined : districtId,
    debouncedCenterSearch,
    districtId !== 'all',
  )
  const list = useNcdaChildrenList(listFilters)

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    districtId !== 'all' ||
    centerId !== 'all' ||
    status !== 'all'

  const districtOptions = districts.data?.items ?? []
  const centerOptions = centers.data?.items ?? []
  const centerTotal = centers.data?.total ?? 0

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.children.title}
        subtitle={ncda.children.subtitle}
        size="compact"
      />

      <PageContent>
        <p className="mb-4 text-caption text-text-secondary">{ncda.children.scopeLabel}</p>

        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.children.networkTitle}
            isLoading={network.isLoading && !network.data && !network.isError}
            isError={network.isError && !network.data}
            onRetry={() => void network.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <StatCard
                label={ncda.children.totalChildren}
                value={network.data?.children ?? '—'}
                icon={<Baby size={18} />}
              />
              <StatCard
                label={ncda.children.activeChildren}
                value={network.data?.activeChildren ?? '—'}
                icon={<Baby size={18} />}
              />
            </div>
            <p className="mt-2 text-caption text-text-muted">{ncda.children.nationalNote}</p>
          </NcdaDashboardSection>

          <section className="space-y-3" aria-labelledby="ncda-children-list">
            <h2 id="ncda-children-list" className="text-subheading font-semibold text-text">
              {ncda.children.listTitle}
            </h2>

            <Card padding="md" className="border-border">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label
                    htmlFor="ncda-child-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.children.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="ncda-child-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      placeholder={ncda.children.searchPlaceholder}
                      className="!pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="ncda-child-district"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.children.districtFilter}
                  </label>
                  <SelectInput
                    id="ncda-child-district"
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value)
                      setCenterId('all')
                      setCenterSearch('')
                      setPage(1)
                    }}
                    disabled={districts.isLoading && !districts.data}
                  >
                    <option value="all">{ncda.children.districtAll}</option>
                    {districtOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <label
                    htmlFor="ncda-child-center"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.children.centerFilter}
                  </label>
                  <SelectInput
                    id="ncda-child-center"
                    value={centerId}
                    onChange={(e) => {
                      setCenterId(e.target.value)
                      setPage(1)
                    }}
                    disabled={districtId === 'all' || (centers.isLoading && !centers.data)}
                  >
                    <option value="all">
                      {districtId === 'all'
                        ? ncda.children.centerNeedsDistrict
                        : ncda.children.centerAll}
                    </option>
                    {centerOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectInput>
                  {districtId !== 'all' ? (
                    <div className="mt-2">
                      <TextInput
                        id="ncda-child-center-search"
                        value={centerSearch}
                        onChange={(e) => setCenterSearch(e.target.value)}
                        placeholder={ncda.children.centerSearchPlaceholder}
                        disabled={districtId === 'all'}
                      />
                      {centerTotal > 100 ? (
                        <p className="mt-1 text-caption text-text-muted">
                          {ncda.children.centerOptionsCap}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="ncda-child-status"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.children.statusFilter}
                  </label>
                  <SelectInput
                    id="ncda-child-status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.children.statusAll}</option>
                    <option value="active">{ncda.children.statusActive}</option>
                    <option value="archived">{ncda.children.statusArchived}</option>
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{ncda.children.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {ncda.children.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                  <span className="sr-only">{ncda.children.loading}</span>
                </div>
              ) : items.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasFilters ? ncda.children.emptyFiltered : ncda.children.empty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[48rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{ncda.children.colName}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.children.colReg}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.children.colCenter}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.children.colDistrict}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.children.colStatus}</th>
                          <th className="py-2 font-semibold">{ncda.children.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium text-text" data-label={ncda.children.colName}>{row.fullName}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.children.colReg}>
                              {row.registrationNumber || '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.children.colCenter}>
                              {row.centerName || '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.children.colDistrict}>
                              {row.district || '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.children.colStatus}>
                              {statusLabel(row.status)}
                            </td>
                            <td className="py-2.5 td-actions" data-label={ncda.children.colAction}>
                              <Link
                                to={`${NCDA_PATHS.children}/${row.id}`}
                                className="text-primary font-semibold hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
                              >
                                {ncda.children.viewDetail}
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
                    pageSizeSelectId="ncda-children-page-size"
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

function statusLabel(status: ChildStatus | string): string {
  if (status === 'active') return ncda.children.statusActive
  if (status === 'transferred') return ncda.children.statusTransferred
  if (status === 'archived') return ncda.children.statusArchived
  return String(status)
}
