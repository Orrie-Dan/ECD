import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { StatCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useNcdaCreateUser,
  useNcdaUserCenterOptions,
  useNcdaUserDistrictOptions,
  useNcdaUsersList,
  useNcdaUsersNetwork,
} from '@/features/ncda/users/queries'
import { NCDA_CREATABLE_ROLES } from '@/api/resources/users'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { ApiUserStatus, UserRole } from '@/api/generated/models'
import { normalizeApiError } from '@/api/errors'

type RoleFilter = 'all' | UserRole
type StatusFilter = 'all' | ApiUserStatus

/**
 * NCDA Users management — national admin directory + create (DFP / ECD director / caregiver).
 * Temporary passwords are shown once and never cached in query state.
 */
export function NcdaUsersPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.users.title}
          subtitle={ncda.users.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.users.mockOnlyTitle}
            description={ncda.users.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaUsersLive />
}

function NcdaUsersLive() {
  const { showError, showSuccess } = useToast()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [districtId, setDistrictId] = useState('all')
  const [centerId, setCenterId] = useState('all')
  const [centerSearch, setCenterSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(false)
  const [tempSecret, setTempSecret] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const debouncedCenterSearch = useDebounce(centerSearch, 300)

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
      page,
      pageSize,
    }),
    [debouncedSearch, role, status, districtId, centerId, page, pageSize],
  )

  const network = useNcdaUsersNetwork()
  const districts = useNcdaUserDistrictOptions()
  const centers = useNcdaUserCenterOptions(
    districtId === 'all' ? undefined : districtId,
    debouncedCenterSearch,
    districtId !== 'all',
  )
  const list = useNcdaUsersList(listFilters)
  const createMutation = useNcdaCreateUser()

  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    role: 'district_focal_person' as UserRole,
    districtId: '',
    centerId: '',
  })
  const createCenters = useNcdaUserCenterOptions(
    createForm.role === 'caregiver' || createForm.role === 'ecd_director'
      ? createForm.districtId || undefined
      : undefined,
    undefined,
    (createForm.role === 'caregiver' || createForm.role === 'ecd_director') &&
      Boolean(createForm.districtId),
  )

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? list.data?.data ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    role !== 'all' ||
    status !== 'all' ||
    districtId !== 'all' ||
    centerId !== 'all'

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!NCDA_CREATABLE_ROLES.includes(createForm.role)) {
      showError(ncda.users.createRoleForbidden)
      return
    }
    try {
      const result = await createMutation.mutateAsync({
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
        ...(createForm.role === 'district_focal_person'
          ? { districtId: createForm.districtId }
          : {}),
        ...(createForm.role === 'caregiver' || createForm.role === 'ecd_director'
          ? { centerId: createForm.centerId }
          : {}),
      })
      setTempSecret(result.temporaryPassword)
      setShowCreate(false)
      setCreateForm({
        username: '',
        fullName: '',
        phone: '',
        role: 'district_focal_person',
        districtId: '',
        centerId: '',
      })
      showSuccess(ncda.users.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || ncda.users.createError)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.users.title}
        subtitle={ncda.users.subtitle}
        size="compact"
      />
      <PageContent>
        <div className="space-y-8">
          <NcdaDashboardSection
            title={ncda.users.networkTitle}
            isLoading={network.isLoading && !network.data && !network.isError}
            isError={network.isError && !network.data}
            onRetry={() => void network.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <StatCard
                label={ncda.users.totalUsers}
                value={network.data?.users ?? '—'}
                icon={<Users size={18} />}
              />
              <StatCard
                label={ncda.users.activeUsers}
                value={network.data?.activeUsers ?? '—'}
                icon={<Users size={18} />}
              />
            </div>
            <p className="mt-2 text-caption text-text-muted">{ncda.users.securityNote}</p>
          </NcdaDashboardSection>

          {tempSecret ? (
            <Card padding="md" className="border-amber-500/40 bg-amber-50/40">
              <h2 className="text-subheading font-semibold text-text mb-2">
                {ncda.users.tempPasswordTitle}
              </h2>
              <p className="text-body text-text-secondary mb-2">{ncda.users.tempPasswordBody}</p>
              <p className="font-mono text-heading tracking-wide select-all">{tempSecret}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => setTempSecret(null)}
              >
                {ncda.users.tempPasswordDismiss}
              </Button>
            </Card>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-subheading font-semibold text-text">{ncda.users.listTitle}</h2>
              <Button type="button" variant="primary" onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? ncda.users.cancelCreate : ncda.users.createUser}
              </Button>
            </div>

            {showCreate ? (
              <Card padding="md" className="border-border">
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onCreate}>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {ncda.users.colUsername}
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
                      {ncda.users.colFullName}
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
                      {ncda.users.colPhone}
                    </label>
                    <TextInput
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {ncda.users.colRole}
                    </label>
                    <SelectInput
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          role: e.target.value as UserRole,
                          centerId: '',
                        }))
                      }
                    >
                      <option value="district_focal_person">
                        {ncda.users.roleDistrict}
                      </option>
                      <option value="ecd_director">{ncda.users.roleDirector}</option>
                      <option value="caregiver">{ncda.users.roleCaregiver}</option>
                    </SelectInput>
                    <p className="mt-1 text-caption text-text-muted">
                      {ncda.users.createRoleHint}
                    </p>
                  </div>
                  {createForm.role === 'district_focal_person' ||
                  createForm.role === 'caregiver' ||
                  createForm.role === 'ecd_director' ? (
                    <div>
                      <label className="mb-1 block text-caption font-semibold text-text-secondary">
                        {ncda.users.districtFilter}
                      </label>
                      <SelectInput
                        required={createForm.role === 'district_focal_person'}
                        value={createForm.districtId}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            districtId: e.target.value,
                            centerId: '',
                          }))
                        }
                      >
                        <option value="">{ncda.users.selectDistrict}</option>
                        {(districts.data?.items ?? []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                  ) : null}
                  {createForm.role === 'caregiver' || createForm.role === 'ecd_director' ? (
                    <div>
                      <label className="mb-1 block text-caption font-semibold text-text-secondary">
                        {ncda.users.centerFilter}
                      </label>
                      <SelectInput
                        required
                        value={createForm.centerId}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, centerId: e.target.value }))
                        }
                        disabled={!createForm.districtId}
                      >
                        <option value="">{ncda.users.selectCenter}</option>
                        {(createCenters.data?.items ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={createMutation.isPending}
                      disabled={createMutation.isPending}
                    >
                      {ncda.users.submitCreate}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null}

            <Card padding="md" className="border-border">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label
                    htmlFor="ncda-user-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {ncda.users.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="ncda-user-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      className="!pl-9"
                      placeholder={ncda.users.searchPlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {ncda.users.roleFilter}
                  </label>
                  <SelectInput
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as RoleFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.users.statusAll}</option>
                    <option value="caregiver">{ncda.users.roleCaregiver}</option>
                    <option value="ecd_director">{ncda.users.roleDirector}</option>
                    <option value="district_focal_person">{ncda.users.roleDistrict}</option>
                    <option value="ncda_admin">{ncda.users.roleNcda}</option>
                  </SelectInput>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {ncda.users.statusFilter}
                  </label>
                  <SelectInput
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.users.statusAll}</option>
                    <option value="ACTIVE">{ncda.users.statusActive}</option>
                    <option value="SUSPENDED">{ncda.users.statusSuspended}</option>
                  </SelectInput>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {ncda.users.districtFilter}
                  </label>
                  <SelectInput
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value)
                      setCenterId('all')
                      setPage(1)
                    }}
                  >
                    <option value="all">{ncda.users.districtAll}</option>
                    {(districts.data?.items ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {ncda.users.centerFilter}
                  </label>
                  <SelectInput
                    value={centerId}
                    onChange={(e) => {
                      setCenterId(e.target.value)
                      setPage(1)
                    }}
                    disabled={districtId === 'all'}
                  >
                    <option value="all">
                      {districtId === 'all'
                        ? ncda.users.centerNeedsDistrict
                        : ncda.users.centerAll}
                    </option>
                    {(centers.data?.items ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectInput>
                  {districtId !== 'all' ? (
                    <TextInput
                      className="mt-2"
                      value={centerSearch}
                      onChange={(e) => setCenterSearch(e.target.value)}
                      placeholder={ncda.users.centerSearchPlaceholder}
                    />
                  ) : null}
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="mt-4 space-y-3">
                  <p className="text-body text-text-secondary">{ncda.users.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {ncda.users.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="mt-4 text-body text-text-secondary">
                  {hasFilters ? ncda.users.emptyFiltered : ncda.users.empty}
                </p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[44rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{ncda.users.colUsername}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.users.colFullName}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.users.colRole}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.users.colStatus}</th>
                          <th className="py-2 pr-3 font-semibold">{ncda.users.colScope}</th>
                          <th className="py-2 font-semibold">{ncda.users.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td className="py-2.5 pr-3 font-medium text-text" data-label={ncda.users.colUsername}>{row.username}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.users.colFullName}>{row.fullName}</td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.users.colRole}>
                              {roleLabel(row.role)}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.users.colStatus}>
                              {statusLabel(row.status)}
                            </td>
                            <td className="py-2.5 pr-3 text-text-secondary" data-label={ncda.users.colScope}>
                              {row.center?.name ?? row.district?.name ?? '—'}
                            </td>
                            <td className="py-2.5 td-actions" data-label={ncda.users.colAction}>
                              <Link
                                to={`${NCDA_PATHS.users}/${row.id}`}
                                className="text-primary font-semibold hover:underline"
                              >
                                {ncda.users.viewDetail}
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
                    pageSizeSelectId="ncda-users-page-size"
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

function roleLabel(role: string): string {
  if (role === 'caregiver') return ncda.users.roleCaregiver
  if (role === 'ecd_director') return ncda.users.roleDirector
  if (role === 'district_focal_person') return ncda.users.roleDistrict
  if (role === 'ncda_admin') return ncda.users.roleNcda
  return role
}

function statusLabel(status: string): string {
  if (status === 'ACTIVE') return ncda.users.statusActive
  if (status === 'SUSPENDED') return ncda.users.statusSuspended
  return status
}
