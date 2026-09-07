import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
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
import { useAuth } from '@/contexts/AppContext'
import {
  useCenterCreateCaregiver,
  useCenterUpdateUser,
  useCenterUsersList,
} from '@/features/caretaker/users/queries'
import { UserProfileEditForm } from '@/components/users/UserProfileEditForm'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { ApiUserStatus, UpdateUserDto, UserResponseDto } from '@/api/generated/models'
import { normalizeApiError } from '@/api/errors'
import {
  EDUCATION_LEVEL_OPTIONS,
  PERSON_SEX_OPTIONS,
  type EducationLevel,
  type PersonSex,
} from '@/models/center-educators'

const USERS_PATH = '/caretaker/abakoresha'

type StatusFilter = 'all' | ApiUserStatus

/**
 * ECD director — caregiver accounts at this center.
 */
export function CenterUsersPage() {
  return (
    <CaretakerLayout>
      {!env.isLive ? (
        <PageContainer>
          <PageHeader
            title={caretaker.users.title}
            description={caretaker.users.subtitle}
          />
          <PageContent>
            <LiveUnavailableState
              title={caretaker.users.mockOnlyTitle}
              description={caretaker.users.mockOnlyBody}
            />
          </PageContent>
        </PageContainer>
      ) : (
        <CenterUsersLive />
      )}
    </CaretakerLayout>
  )
}

function CenterUsersLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserResponseDto | null>(null)
  const [tempSecret, setTempSecret] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    gender: '' as PersonSex | '',
    educationLevel: '' as EducationLevel | '',
  })

  const debouncedSearch = useDebounce(search, 300)

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      centerId: centerId || undefined,
      page,
      pageSize,
    }),
    [debouncedSearch, status, centerId, page, pageSize],
  )

  const list = useCenterUsersList(listFilters, Boolean(centerId))
  const createMutation = useCenterCreateCaregiver()
  const updateMutation = useCenterUpdateUser(editing?.id ?? '')

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = list.data?.items ?? list.data?.data ?? []
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!centerId) {
      showError(caretaker.users.missingCenter)
      return
    }
    try {
      const result = await createMutation.mutateAsync({
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        role: 'caregiver',
        centerId,
        gender: createForm.gender || undefined,
        educationLevel: createForm.educationLevel || undefined,
      })
      setTempSecret(result.temporaryPassword)
      setShowCreate(false)
      setCreateForm({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        gender: '',
        educationLevel: '',
      })
      showSuccess(caretaker.users.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || caretaker.users.createError)
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
      showSuccess(caretaker.users.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || caretaker.users.updateError)
    }
  }

  return (
    <PageContainer>
      <PageHeader title={caretaker.users.title} description={caretaker.users.subtitle} />
      <PageContent>
        <p className="mb-4 text-caption text-text-secondary">{caretaker.users.scopeLabel}</p>

        {!centerId ? (
          <LiveUnavailableState
            title={caretaker.users.missingCenter}
            description={caretaker.users.missingCenterDesc}
          />
        ) : (
          <div className="space-y-6">
            {tempSecret ? (
              <TempPasswordBanner
                password={tempSecret}
                title={caretaker.users.tempPasswordTitle}
                body={caretaker.users.tempPasswordBody}
                dismissLabel={caretaker.users.tempPasswordDismiss}
                onDismiss={() => setTempSecret(null)}
              />
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body text-text-secondary flex items-center gap-2">
                <Users size={18} aria-hidden />
                {caretaker.users.title}
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
                {showCreate || editing ? caretaker.users.cancelCreate : caretaker.users.addCaregiver}
              </Button>
            </div>

            {showCreate ? (
              <Card padding="md" className="border-border">
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onCreate}>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {caretaker.users.colUsername}
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
                      {caretaker.users.colFullName}
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
                      {caretaker.users.colPhone}
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
                      {caretaker.users.colEmail}
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
                      {caretaker.director.educators.gender}
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
                      <option value="">{caretaker.director.educators.optionalBlank}</option>
                      {PERSON_SEX_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {caretaker.director.educators.genderLabels[value]}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-text-secondary">
                      {caretaker.director.educators.educationLevel}
                    </label>
                    <SelectInput
                      value={createForm.educationLevel}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          educationLevel: e.target.value as EducationLevel | '',
                        }))
                      }
                    >
                      <option value="">{caretaker.director.educators.optionalBlank}</option>
                      {EDUCATION_LEVEL_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {caretaker.director.educators.educationLabels[value]}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <p className="sm:col-span-2 text-caption text-text-muted">
                    {caretaker.users.roleFixed}
                  </p>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={createMutation.isPending}
                      disabled={createMutation.isPending}
                    >
                      {caretaker.users.submitCreate}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null}

            {editing ? (
              <Card padding="md" className="border-border space-y-3">
                <h2 className="text-subheading font-semibold text-text">
                  {caretaker.users.editTitle}
                </h2>
                <p className="text-caption text-text-muted">@{editing.username}</p>
                <UserProfileEditForm
                  key={editing.id}
                  initial={editing}
                  labels={{
                    fullName: caretaker.users.colFullName,
                    phone: caretaker.users.colPhone,
                    email: caretaker.users.colEmail,
                    gender: caretaker.director.educators.gender,
                    selectGender: caretaker.director.educators.optionalBlank,
                    genderMale: caretaker.director.educators.genderLabels.male,
                    genderFemale: caretaker.director.educators.genderLabels.female,
                    educationLevel: caretaker.director.educators.educationLevel,
                    optionalBlank: caretaker.director.educators.optionalBlank,
                    status: caretaker.users.colStatus,
                    statusActive: caretaker.users.statusActive,
                    statusSuspended: caretaker.users.statusSuspended,
                    save: caretaker.users.saveChanges,
                    cancel: caretaker.users.cancelCreate,
                  }}
                  pending={updateMutation.isPending}
                  onSubmit={onUpdate}
                  onCancel={() => setEditing(null)}
                />
              </Card>
            ) : null}

            <Card padding="md" className="border-border space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="center-user-search"
                    className="mb-1 block text-caption font-semibold text-text-secondary"
                  >
                    {caretaker.users.searchPlaceholder}
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      aria-hidden
                    />
                    <TextInput
                      id="center-user-search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      className="!pl-9"
                      placeholder={caretaker.users.searchPlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-caption font-semibold text-text-secondary">
                    {caretaker.users.statusFilter}
                  </label>
                  <SelectInput
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as StatusFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">{caretaker.users.statusAll}</option>
                    <option value="ACTIVE">{caretaker.users.statusActive}</option>
                    <option value="SUSPENDED">{caretaker.users.statusSuspended}</option>
                  </SelectInput>
                </div>
              </div>

              {list.isError && !list.data ? (
                <div className="space-y-3">
                  <p className="text-body text-text-secondary">{caretaker.users.listError}</p>
                  <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                    {caretaker.users.retry}
                  </Button>
                </div>
              ) : list.isLoading && !list.data ? (
                <Skeleton height="8rem" className="w-full" rounded="md" />
              ) : items.length === 0 ? (
                <p className="text-body text-text-secondary">
                  {debouncedSearch || status !== 'all'
                    ? caretaker.users.emptyFiltered
                    : caretaker.users.empty}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 sm:min-w-[40rem] text-left text-body responsive-table-cards">
                      <thead>
                        <tr className="border-b border-border text-caption text-text-secondary">
                          <th className="py-2 pr-3 font-semibold">{caretaker.users.colFullName}</th>
                          <th className="py-2 pr-3 font-semibold">{caretaker.users.colUsername}</th>
                          <th className="py-2 pr-3 font-semibold">{caretaker.users.colStatus}</th>
                          <th className="py-2 font-semibold">{caretaker.users.colAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-b border-border/70">
                            <td
                              className="py-2.5 pr-3 font-medium"
                              data-label={caretaker.users.colFullName}
                            >
                              {row.fullName}
                            </td>
                            <td className="py-2.5 pr-3" data-label={caretaker.users.colUsername}>
                              {row.username}
                            </td>
                            <td className="py-2.5 pr-3" data-label={caretaker.users.colStatus}>
                              {row.status === 'ACTIVE'
                                ? caretaker.users.statusActive
                                : caretaker.users.statusSuspended}
                            </td>
                            <td className="py-2.5 td-actions" data-label={caretaker.users.colAction}>
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  className="text-primary font-semibold hover:underline"
                                  onClick={() => openEdit(row)}
                                >
                                  {caretaker.users.editUser}
                                </button>
                                <Link
                                  to={`${USERS_PATH}/${row.id}`}
                                  className="text-primary font-semibold hover:underline"
                                >
                                  {caretaker.users.viewDetail}
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
                    pageSizeSelectId="center-users-page-size"
                  />
                </>
              )}
            </Card>
          </div>
        )}
      </PageContent>
    </PageContainer>
  )
}
