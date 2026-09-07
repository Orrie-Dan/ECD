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
  useDistrictUpdateCaregiver,
} from '@/features/district/users/queries'
import { UserProfileEditForm } from '@/components/users/UserProfileEditForm'
import { DISTRICT_CREATABLE_ROLES } from '@/api/resources/users'
import { district } from '@/locales/rw/district'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { ApiUserStatus, PersonSex, UpdateUserDto, UserResponseDto, UserRole } from '@/api/generated/models'
import { normalizeApiError } from '@/api/errors'

type StatusFilter = 'all' | ApiUserStatus
type RoleFilter = 'all' | 'caregiver' | 'ecd_director'
type CreatableCenterRole = (typeof DISTRICT_CREATABLE_ROLES)[number]

const CAREGIVERS_PATH = '/district/abakoresha'

function roleLabel(role: UserRole | string | undefined): string {
  if (role === 'ecd_director') return district.caregivers.roleDirector
  if (role === 'caregiver') return district.caregivers.roleCaregiver
  return role ?? '—'
}

/**
 * District center-staff account management — server-paginated list + create
 * (caregiver or ECD director).
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
  const presetRole = searchParams.get('role')?.trim()
  const initialCreateRole: CreatableCenterRole =
    presetRole === 'ecd_director' ? 'ecd_director' : 'caregiver'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [centerId, setCenterId] = useState(presetCenterId || 'all')
  const [centerSearch, setCenterSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(shouldOpenCreate)
  const [editing, setEditing] = useState<UserResponseDto | null>(null)
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
      role: roleFilter === 'all' ? null : roleFilter,
      page,
      pageSize,
    }),
    [debouncedSearch, status, centerId, roleFilter, page, pageSize],
  )

  const filterCenters = useDistrictCaregiverCenterOptions(debouncedCenterSearch)
  const createCenters = useDistrictCaregiverCenterOptions(undefined)
  const list = useDistrictCaregiversList(listFilters)
  const createMutation = useDistrictCreateCaregiver()
  const updateMutation = useDistrictUpdateCaregiver(editing?.id ?? '')

  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    gender: '' as PersonSex | '',
    role: initialCreateRole as CreatableCenterRole,
    centerId: presetCenterId,
  })

  useEffect(() => {
    if (presetCenterId) {
      setCreateForm((f) => ({ ...f, centerId: presetCenterId }))
    }
  }, [presetCenterId])

  useEffect(() => {
    if (presetRole === 'ecd_director' || presetRole === 'caregiver') {
      setCreateForm((f) => ({ ...f, role: presetRole }))
    }
  }, [presetRole])

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? list.data?.data ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const centerLocked = Boolean(presetCenterId)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!DISTRICT_CREATABLE_ROLES.includes(createForm.role)) {
      showError(district.caregivers.createError)
      return
    }
    const createdRole = createForm.role
    try {
      const result = await createMutation.mutateAsync({
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        gender: createForm.gender || undefined,
        role: createForm.role,
        centerId: createForm.centerId,
      })
      setTempSecret(result.temporaryPassword)
      setShowCreate(false)
      setCreateForm({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        gender: '',
        role: 'caregiver',
        centerId: presetCenterId || '',
      })
      if (shouldOpenCreate || presetCenterId || presetRole) {
        const next = new URLSearchParams(searchParams)
        next.delete('create')
        next.delete('role')
        if (!presetCenterId) next.delete('centerId')
        setSearchParams(next, { replace: true })
      }
      showSuccess(
        createdRole === 'ecd_director'
          ? district.caregivers.createDirectorSuccess
          : district.caregivers.createSuccess,
      )
    } catch (err) {
      showError(normalizeApiError(err).message || district.caregivers.createError)
    }
  }

  function openEdit(row: UserResponseDto) {
    setShowCreate(false)
    setEditing(row)
  }

  async function onUpdate(dto: UpdateUserDto) {
    try {
      await updateMutation.mutateAsync(dto)
      setEditing(null)
      showSuccess(district.caregivers.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || district.caregivers.updateError)
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
                variant={showCreate || editing ? 'secondary' : 'primary'}
                onClick={() => {
                  if (editing) {
                    setEditing(null)
                    return
                  }
                  setShowCreate((v) => !v)
                }}
              >
                {showCreate || editing ? district.caregivers.cancelCreate : district.caregivers.addUser}
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
                      {district.caregivers.colEmail}
                    </label>
                    <TextInput
                      type="email"
                      autoComplete="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.colGender}
                    </label>
                    <SelectInput
                      required
                      value={createForm.gender}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          gender: e.target.value as PersonSex | '',
                        }))
                      }
                    >
                      <option value="">{district.caregivers.selectGender}</option>
                      <option value="male">{district.caregivers.genderMale}</option>
                      <option value="female">{district.caregivers.genderFemale}</option>
                    </SelectInput>
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {district.caregivers.colRole}
                    </label>
                    <SelectInput
                      required
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          role: e.target.value as CreatableCenterRole,
                        }))
                      }
                    >
                      <option value="caregiver">{district.caregivers.roleCaregiver}</option>
                      <option value="ecd_director">{district.caregivers.roleDirector}</option>
                    </SelectInput>
                    <p className="mt-1 text-caption text-text-muted">
                      {district.caregivers.roleCreateHint}
                    </p>
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

            {editing ? (
              <Card padding="md" className="border-border space-y-3">
                <h2 className="text-subheading font-semibold text-text">
                  {district.caregivers.editTitle}
                </h2>
                <p className="text-caption text-text-muted">@{editing.username}</p>
                <UserProfileEditForm
                  key={editing.id}
                  initial={editing}
                  labels={{
                    fullName: district.caregivers.colFullName,
                    phone: district.caregivers.colPhone,
                    email: district.caregivers.colEmail,
                    gender: district.caregivers.colGender,
                    selectGender: district.caregivers.selectGender,
                    genderMale: district.caregivers.genderMale,
                    genderFemale: district.caregivers.genderFemale,
                    status: district.caregivers.colStatus,
                    statusActive: district.caregivers.statusActive,
                    statusSuspended: district.caregivers.statusSuspended,
                    save: district.caregivers.saveChanges,
                    cancel: district.caregivers.cancelCreate,
                  }}
                  pending={updateMutation.isPending}
                  onSubmit={onUpdate}
                  onCancel={() => setEditing(null)}
                />
              </Card>
            ) : null}

            <Card padding="md" className="border-border space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
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
                    {district.caregivers.colRole}
                  </label>
                  <SelectInput
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value as RoleFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{district.caregivers.roleAll}</option>
                    <option value="caregiver">{district.caregivers.roleCaregiver}</option>
                    <option value="ecd_director">{district.caregivers.roleDirector}</option>
                  </SelectInput>
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
                  {debouncedSearch || status !== 'all' || centerId !== 'all' || roleFilter !== 'all'
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
                            {district.caregivers.colRole}
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
                            <td className="py-2.5 pr-3" data-label={district.caregivers.colRole}>
                              {roleLabel(row.role)}
                            </td>
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
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  className="text-primary font-semibold hover:underline"
                                  onClick={() => openEdit(row)}
                                >
                                  {district.caregivers.editUser}
                                </button>
                                <Link
                                  to={`${CAREGIVERS_PATH}/${row.id}`}
                                  className="text-primary font-semibold hover:underline"
                                >
                                  {district.caregivers.viewDetail}
                                </Link>
                              </div>
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
