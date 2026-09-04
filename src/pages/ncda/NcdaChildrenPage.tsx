import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Baby } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput, FormField, TextInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListControlBar } from '@/components/ui/ListControlBar'
import { FilterResultsBar } from '@/components/ui/FilterResultsBar'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { ChildCard } from '@/components/caretaker/ChildCard'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaChildCenterOptions,
  useNcdaChildDistrictOptions,
  useNcdaChildrenList,
  useNcdaChildrenNetwork,
} from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { buildChildDetailPath } from '@/lib/child-routes'
import { ncda } from '@/locales/rw/ncda'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE, type ChildStatus, type PageSizeOption } from '@/types'

type StatusFilter = 'all' | ChildStatus

const NCDA_CHILDREN_VIEW_OPTIONS = [
  { value: 'all', label: ncda.children.statusAll },
  { value: 'active', label: ncda.children.statusActive },
  { value: 'archived', label: ncda.children.statusArchived },
]

function ChildrenListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label={ncda.children.loading}
      role="status"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  )
}

/**
 * NCDA Children — national oversight directory with caretaker-style card roster.
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const presetDistrict = searchParams.get('district') ?? 'all'
  const presetCenter = searchParams.get('centre') ?? searchParams.get('center') ?? 'all'
  const presetStatusRaw = searchParams.get('status')
  const presetStatus: StatusFilter =
    presetStatusRaw === 'active' || presetStatusRaw === 'archived' ? presetStatusRaw : 'all'

  const [search, setSearch] = useState('')
  const [districtId, setDistrictId] = useState(presetDistrict)
  const [centerId, setCenterId] = useState(presetCenter)
  const [centerSearch, setCenterSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>(presetStatus)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    setDistrictId(presetDistrict)
    setCenterId(presetCenter)
    setStatus(presetStatus)
    setPage(1)
  }, [presetDistrict, presetCenter, presetStatus])

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
  const activeCount = network.data?.activeChildren ?? 0

  const districtOptions = districts.data?.items ?? []
  const centerOptions = centers.data?.items ?? []
  const centerTotal = centers.data?.total ?? 0

  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    districtId !== 'all' ||
    centerId !== 'all' ||
    status !== 'all'

  const hasUrlPreset =
    presetDistrict !== 'all' || presetCenter !== 'all' || presetStatus !== 'all'

  const presetLabel = useMemo(() => {
    if (presetStatus === 'active') return ncda.children.statusActive
    if (presetStatus === 'archived') return ncda.children.statusArchived
    if (presetDistrict !== 'all') {
      return districtOptions.find((d) => d.id === presetDistrict)?.name ?? presetDistrict
    }
    return ncda.children.listTitle
  }, [presetStatus, presetDistrict, districtOptions])

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (status !== 'all') {
      parts.push(
        status === 'active' ? ncda.children.statusActive : ncda.children.statusArchived,
      )
    }
    if (districtId !== 'all') {
      parts.push(districtOptions.find((d) => d.id === districtId)?.name ?? districtId)
    }
    if (centerId !== 'all') {
      parts.push(centerOptions.find((c) => c.id === centerId)?.name ?? centerId)
    }
    if (debouncedSearch.trim()) {
      parts.push(`"${debouncedSearch.trim()}"`)
    }
    return parts.join(' · ')
  }, [status, districtId, centerId, debouncedSearch, districtOptions, centerOptions])

  function clearPreset() {
    setSearchParams({}, { replace: true })
  }

  function resetAll() {
    setSearch('')
    setDistrictId('all')
    setCenterId('all')
    setCenterSearch('')
    setStatus('all')
    setPage(1)
    clearPreset()
  }

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.children.title}
        description={ncda.children.subtitle}
        badge={`${activeCount.toLocaleString('en-US')} ${ncda.children.statusActive.toLowerCase()}`}
        size="compact"
      />

      <PageContent>
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
          </NcdaDashboardSection>

          <section className="space-y-4" aria-labelledby="ncda-children-list">
            <h2 id="ncda-children-list" className="text-subheading font-semibold text-text">
              {ncda.children.listTitle}
            </h2>

            {hasUrlPreset ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary-light/40 px-3 py-2">
                <p className="text-caption text-text-secondary">
                  {ncda.children.presetBanner.replace('{label}', presetLabel)}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={clearPreset}>
                  {ncda.children.clearPreset}
                </Button>
              </div>
            ) : null}

            <ListControlBar
              childName={search}
              onChildNameChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              viewState={status}
              onViewStateChange={(value) => {
                setStatus(value as StatusFilter)
                setPage(1)
              }}
              viewOptions={NCDA_CHILDREN_VIEW_OPTIONS}
              onOpenSearchFilters={() => {
                document.getElementById('ncda-geo-filters')?.scrollIntoView({ behavior: 'smooth' })
              }}
              hasActiveSearchFilters={districtId !== 'all' || centerId !== 'all'}
              searchPlaceholder={ncda.children.searchPlaceholder}
            />

            <div id="ncda-geo-filters" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField label={ncda.children.districtFilter}>
                <SelectInput
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
              </FormField>
              <FormField label={ncda.children.centerFilter}>
                <SelectInput
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
              </FormField>
            </div>

            {districtId !== 'all' ? (
              <FormField label={ncda.children.centerSearchPlaceholder}>
                <TextInput
                  value={centerSearch}
                  onChange={(e) => setCenterSearch(e.target.value)}
                  placeholder={ncda.children.centerSearchPlaceholder}
                  disabled={districtId === 'all'}
                />
              </FormField>
            ) : null}
            {districtId !== 'all' && centerTotal > 100 ? (
              <p className="text-caption text-text-muted">{ncda.children.centerOptionsCap}</p>
            ) : null}

            {!list.isLoading && list.data ? (
              <FilterResultsBar
                count={total}
                summary={hasFilters ? filterSummary : null}
                onClear={resetAll}
                showClear={hasFilters}
              />
            ) : null}

            {list.isError && !list.data ? (
              <EmptyState
                icon={<Baby size={56} className="text-text-muted" strokeWidth={1.5} />}
                title={ncda.children.listError}
                description={ncda.children.listError}
                action={
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {ncda.children.retry}
                  </Button>
                }
              />
            ) : list.isLoading && !list.data ? (
              <ChildrenListSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Baby size={48} className="text-text-muted" strokeWidth={1.5} />}
                title={hasFilters ? ncda.children.emptyFiltered : ncda.children.empty}
                description={
                  hasFilters ? ncda.children.emptyFiltered : ncda.children.nationalNote
                }
                action={
                  hasFilters ? (
                    <Button variant="tertiary" size="md" onClick={resetAll}>
                      {caretaker.children.resetFilters}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      onView={() =>
                        navigate(buildChildDetailPath(NCDA_PATHS.children, child))
                      }
                    />
                  ))}
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
          </section>
        </div>
      </PageContent>
    </PageContainer>
  )
}
