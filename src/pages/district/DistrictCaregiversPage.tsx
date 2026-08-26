import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { TempPasswordBanner } from '@/components/district/TempPasswordBanner'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useDistrictCaregiverCenterOptions,
  useDistrictCaregiversList,
  useDistrictCreateCaregiver,
} from '@/features/district/users/queries'
import { district } from '@/locales/rw/district'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { ApiUserStatus } from '@/api/generated/models'
import { normalizeApiError } from '@/api/errors'

type StatusFilter = 'all' | ApiUserStatus

const CAREGIVERS_PATH = '/district/abakoresha'

/**
 * District caregiver account management — server-paginated list + create (caregiver only).
 */
export function DistrictCaregiversPage() {
  if (!env.isLive) {
    return (
      <>
        <PageContainer>
          <PageHeader
            title={district.caregivers.title}
            subtitle={district.caregivers.subtitle}
            size="compact"
          />
          <PageContent>
            <LiveUnavailableState
              title={district.caregivers.mockOnlyTitle}
              description={district.caregivers.mockOnlyBody}
            />
          </PageContent>
        </PageContainer>
      </>
    )
  }

  return <DistrictCaregiversLive />
}

function DistrictCaregiversLive() {
  const { showError, showSuccess } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const presetCenterId = searchParams.get('centerId')?.trim() ?? ''
  const shouldOpenCreate = searchParams.get('create') === '1'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [centerId, setCenterId] = useState(presetCenterId || 'all')
  const [centerSearch, setCenterSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(shouldOpenCreate)
  const [tempSecret, setTempSecret] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  useEffect(() => {
    if (presetCenterId) {
      setCenterId(presetCenterId)
    }
    if (shouldOpenCreate) {
      setShowCreate(true)
    }
  }, [presetCenterId, shouldOpenCreate])

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      centerId: centerId === 'all' ? undefined : centerId,
      page,
      pageSize,
    }),
    [debouncedSearch, status, centerId, page, pageSize],
  )

  const filterCenters = useDistrictCaregiverCenterOptions(debouncedCenterSearch)
  const createCenters = useDistrictCaregiverCenterOptions(undefined)
  const list = useDistrictCaregiversList(listFilters)
  const createMutation = useDistrictCreateCaregiver()

  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    centerId: presetCenterId,
  })

  useEffect(() => {
    if (presetCenterId) {
      setCreateForm((f) => ({ ...f, centerId: presetCenterId }))
    }
  }, [presetCenterId])

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? list.data?.data ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const centerLocked = Boolean(presetCenterId)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    try {
      const result = await createMutation.mutateAsync({
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim() || undefined,
        role: 'caregiver',
        centerId: createForm.centerId,
      })
      setTempSecret(result.temporaryPassword)
      setShowCreate(false)
      setCreateForm({
        username: '',
        fullName: '',
        phone: '',
        centerId: presetCenterId || '',
      })
      if (shouldOpenCreate || presetCenterId) {
        const next = new URLSearchParams(searchParams)
        next.delete('create')
        if (!presetCenterId) next.delete('centerId')
        setSearchParams(next, { replace: true })
      }
      showSuccess(district.caregivers.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || district.caregivers.createError)
    }
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title={district.caregivers.title}
          subtitle={district.caregivers.subtitle}
          size="compact"
        />
        <PageContent>
          <p className="mb-4 text-caption text-text-secondary">{district.caregivers.scopeLabel}</p>

          <div className="space-y-6">
            {tempSecret ? (
              <TempPasswordBanner
                password={tempSecret}
                title={district.caregivers.tempPasswordTitle}
                body={district.caregivers.tempPasswordBody}
                dismissLabel={district.caregivers.tempPasswordDismiss}
                onDismiss={() => setTempSecret(null)}
              />
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body text-text-secondary flex items-center gap-2">
                <Users size={18} aria-hidden />
                {district.caregivers.title}
              </p>
              <Button
                type="button"
                variant={showCreate ? 'secondary' : 'primary'}
                onClick={() => setShowCreate((v) => !v)}
              >
                {showCreate ? district.caregivers.cancelCreate : district.caregivers.addCaregiver}
              </Button>
            </div>

            {showCreate ? (
              <Card padding="md" className="border-border">
                <form
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  onSubmit={onCreate}
                >
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.colUsername}
                    </label>
                    <TextInput
                      required
                      minLength={3}
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, username: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.colFullName}
                    </label>
                    <TextInput
                      required
                      value={createForm.fullName}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, fullName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.colPhone}
                    </label>
                    <TextInput
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.centerFilter}
                    </label>
                    <SelectInput
                      required
                      value={createForm.centerId}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, centerId: e.target.value }))
                      }
                      disabled={centerLocked}
                    >
                      <option value="">{district.caregivers.selectCenter}</option>
                      {(createCenters.data?.items ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <p className="sm:col-span-2 text-caption text-text-muted">
                    {district.caregivers.roleFixed}
                  </p>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={createMutation.isPending}
                      disabled={createMutation.isPending}
                    >
                      {district.caregivers.submitCreate}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null}

            <Card padding="md" className="border-border space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="district-caregiver-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {district.caregivers.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="district-caregiver-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      className="!pl-9"
                      placeholder={district.caregivers.searchPlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {district.caregivers.statusFilter}
                  </label>
                  <SelectInput
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{district.caregivers.statusAll}</option>
                    <option value="ACTIVE">{district.caregivers.statusActive}</option>
                    <option value="SUSPENDED">{district.caregivers.statusSuspended}</option>
                  </SelectInput>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {district.caregivers.centerFilter}
                  </label>
                  <TextInput
                    value={centerSearch}
                    onChange={(e) => setCenterSearch(e.target.value)}
                    placeholder={district.caregivers.centerSearchPlaceholder}
                    className="mb-2"
                  />
                  <SelectInput
                    value={centerId}
                    onChange={(e) => {
                      setCenterId(e.target.value)
                      setPage(1)
                    }}
                    disabled={centerLocked}
                  >
                    <option value="all">{district.caregivers.centerAll}</option>
                    {(filterCenters.data?.items ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="space-y-3">
                  <p className="text-body text-text-secondary">{district.caregivers.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {district.caregivers.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <Skeleton height="8rem" className="w-full" rounded="md" />
              ) : items.length === 0 ? (
                <p className="text-body text-text-secondary">
                  {debouncedSearch || status !== 'all' || centerId !== 'all'
                    ? district.caregivers.emptyFiltered
                    : district.caregivers.empty}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[40rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">
                            {district.caregivers.colFullName}
                          </th>
                          <th className="py-2 pr-3 font-semibold">
                            {district.caregivers.colUsername}
                          </th>
                          <th className="py-2 pr-3 font-semibold">
                            {district.caregivers.colCenter}
                          </th>
                          <th className="py-2 pr-3 font-semibold">
                            {district.caregivers.colStatus}
                          </th>
                          <th className="py-2 font-semibold">
                            {district.caregivers.colAction}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium" data-label={district.caregivers.colFullName}>{row.fullName}</td>
                            <td className="py-2.5 pr-3" data-label={district.caregivers.colUsername}>{row.username}</td>
                            <td className="py-2.5 pr-3" data-label={district.caregivers.colCenter}>
                              {row.center
                                ? `${row.center.name} (${row.center.code})`
                                : '—'}
                            </td>
                            <td className="py-2.5 pr-3" data-label={district.caregivers.colStatus}>
                              {row.status === 'ACTIVE'
                                ? district.caregivers.statusActive
                                : district.caregivers.statusSuspended}
                            </td>
                            <td className="py-2.5 td-actions" data-label={district.caregivers.colAction}>
                              <Link
                                to={`${CAREGIVERS_PATH}/${row.id}`}
                                className="text-primary font-semibold hover:underline"
                              >
                                {district.caregivers.viewDetail}
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
                    pageSizeSelectId="district-caregivers-page-size"
                  />
                </>
              )}
            </Card>
          </div>
        </PageContent>
      </PageContainer>
    </>
  )
}
