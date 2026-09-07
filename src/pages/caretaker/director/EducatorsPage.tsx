import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, GraduationCap, Phone, UserRound } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterReadOnlyBanner,
  RegisterRecordCard,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { TempPasswordBanner } from '@/components/district/TempPasswordBanner'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCenterCreateCaregiver,
  useCenterUpdateUser,
  useCenterUsersList,
} from '@/features/caretaker/users/queries'
import { UserProfileEditForm } from '@/components/users/UserProfileEditForm'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { ApiUserStatus, UpdateUserDto } from '@/api/generated/models'
import type { CenterUserResponse } from '@/api/resources/users'
import {
  EDUCATION_LEVEL_OPTIONS,
  PERSON_SEX_OPTIONS,
  type EducationLevel,
  type PersonSex,
} from '@/models/center-educators'
import {
  formatEducationLevel,
  formatPersonSex,
} from '@/lib/committee-educator-format'

const copy = caretaker.director.educators
const USERS_PATH = '/caretaker/abakoresha'

type StatusFilter = 'all' | ApiUserStatus

/**
 * Section XI — educators/caregivers via the existing users API.
 * Not a parallel staff database; account management deep-links to /abakoresha.
 */
export function EducatorsPage() {
  return (
    <CaretakerLayout
      pageTitle={copy.title}
      backTo={CARETAKER_PATHS.book}
      backLabel={caretaker.director.nav.book}
    >
      {!env.isLive ? (
        <PageContainer>
          <PageHeader title={copy.title} description={copy.subtitle} badge={copy.paperBadge} />
          <PageContent>
            <LiveUnavailableState title={copy.mockOnlyTitle} description={copy.mockOnlyBody} />
          </PageContent>
        </PageContainer>
      ) : (
        <EducatorsLive />
      )}
    </CaretakerLayout>
  )
}

function EducatorsLive() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<CenterUserResponse | null>(null)
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
  const items = (list.data?.items ?? list.data?.data ?? []) as CenterUserResponse[]
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!centerId) {
      showError(copy.missingCenter)
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
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.createError)
    }
  }

  function openCreate() {
    if (editing) {
      setEditing(null)
      return
    }
    setShowCreate((v) => !v)
  }

  function openEdit(row: CenterUserResponse) {
    setShowCreate(false)
    setEditing(row)
  }

  async function onUpdate(dto: UpdateUserDto) {
    try {
      await updateMutation.mutateAsync(dto)
      setEditing(null)
      showSuccess(copy.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.updateError)
    }
  }

  if (!centerId) {
    return (
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} badge={copy.paperBadge} />
        <PageContent>
          <LiveUnavailableState title={copy.missingCenter} description={copy.missingCenterDesc} />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        badge={copy.paperBadge}
        action={
          canMutate ? (
            <Button
              variant={showCreate || editing ? 'secondary' : 'primary'}
              size="sm"
              icon={<Plus size={18} />}
              onClick={openCreate}
            >
              {showCreate || editing ? copy.cancelCreate : copy.add}
            </Button>
          ) : undefined
        }
      />
      <PageContent className="space-y-4">
        <Card padding="md" className="border-border bg-background-subtle">
          <p className="text-body text-text-secondary">{copy.reuseHint}</p>
          <Link
            to={USERS_PATH}
            className="mt-2 inline-block text-caption font-semibold text-primary hover:underline"
          >
            {copy.openAccounts}
          </Link>
        </Card>

        {!canMutate && <RegisterReadOnlyBanner />}

        {tempSecret ? (
          <TempPasswordBanner
            password={tempSecret}
            title={copy.tempPasswordTitle}
            body={copy.tempPasswordBody}
            dismissLabel={copy.tempPasswordDismiss}
            onDismiss={() => setTempSecret(null)}
          />
        ) : null}

        {showCreate && canMutate ? (
          <Card padding="md" elevated className="border-border">
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onCreate}>
              <FormField label={copy.username}>
                <TextInput
                  required
                  minLength={3}
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={copy.fullName}>
                <TextInput
                  required
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={copy.phone}>
                <TextInput
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={copy.email}>
                <TextInput
                  type="email"
                  autoComplete="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={copy.gender} required>
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
                  <option value="">{copy.optionalBlank}</option>
                  {PERSON_SEX_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {copy.genderLabels[value]}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <div className="sm:col-span-2">
                <FormField label={copy.educationLevel}>
                  <SelectInput
                    value={createForm.educationLevel}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        educationLevel: e.target.value as EducationLevel | '',
                      }))
                    }
                  >
                    <option value="">{copy.optionalBlank}</option>
                    {EDUCATION_LEVEL_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {copy.educationLabels[value]}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>
              <p className="sm:col-span-2 text-caption text-text-muted">{copy.roleFixed}</p>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  {copy.submitCreate}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {editing && canMutate ? (
          <Card padding="md" elevated className="border-border space-y-3">
            <h3 className="text-subheading font-semibold text-text">{copy.edit}</h3>
            <p className="text-caption text-text-muted">@{editing.username}</p>
            <UserProfileEditForm
              key={editing.id}
              initial={editing}
              labels={{
                fullName: copy.fullName,
                phone: copy.phone,
                email: copy.email,
                gender: copy.gender,
                selectGender: copy.optionalBlank,
                genderMale: copy.genderLabels.male,
                genderFemale: copy.genderLabels.female,
                educationLevel: copy.educationLevel,
                optionalBlank: copy.optionalBlank,
                status: copy.statusFilter,
                statusActive: copy.statusActive,
                statusSuspended: copy.statusSuspended,
                save: copy.submitEdit,
                cancel: copy.cancelCreate,
              }}
              pending={updateMutation.isPending}
              onSubmit={onUpdate}
              onCancel={() => setEditing(null)}
            />
          </Card>
        ) : null}

        <RegisterFiltersCard>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <FormField label={copy.searchPlaceholder}>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-hidden
                />
                <TextInput
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="!pl-9"
                  placeholder={copy.searchPlaceholder}
                />
              </div>
            </FormField>
            <FormField label={copy.statusFilter}>
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter)
                  setPage(1)
                }}
              >
                <option value="all">{copy.statusAll}</option>
                <option value="ACTIVE">{copy.statusActive}</option>
                <option value="SUSPENDED">{copy.statusSuspended}</option>
              </SelectInput>
            </FormField>
          </div>
        </RegisterFiltersCard>

        <RegisterListPanel
          variant="cards"
          isLoading={list.isLoading && !list.data}
          isError={list.isError && !list.data}
          isEmpty={items.length === 0}
          emptyTitle={debouncedSearch || status !== 'all' ? copy.emptyFiltered : copy.empty}
          emptyDescription={
            debouncedSearch || status !== 'all' ? undefined : copy.emptyDesc
          }
          errorTitle={copy.listError}
          onRetry={() => void list.refetch()}
        >
          <>
            <div className="space-y-3">
              {items.map((row) => (
                <RegisterRecordCard
                  key={row.id}
                  actions={
                    <RegisterViewEditActions
                      viewLabel={copy.manageAccount}
                      onView={() => navigate(`${USERS_PATH}/${row.id}`)}
                      canMutate={canMutate}
                      onEdit={() => openEdit(row)}
                      editLabel={copy.edit}
                    />
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-subheading text-text">{row.fullName}</h4>
                    <Badge variant={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {row.status === 'ACTIVE' ? copy.statusActive : copy.statusSuspended}
                    </Badge>
                  </div>
                  <p className="text-caption text-text-muted">@{row.username}</p>
                  <p className="text-body text-text-secondary flex items-center gap-1.5">
                    <Phone size={14} aria-hidden="true" />
                    {row.phone?.trim() || '—'}
                  </p>
                  <p className="text-caption text-text-muted flex items-center gap-1.5">
                    <UserRound size={14} aria-hidden="true" />
                    {formatPersonSex(row.gender)}
                  </p>
                  <p className="text-caption text-text-muted flex items-center gap-1.5">
                    <GraduationCap size={14} aria-hidden="true" />
                    {formatEducationLevel(row.educationLevel)}
                  </p>
                </RegisterRecordCard>
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
              pageSizeSelectId="educators-page-size"
            />
          </>
        </RegisterListPanel>
      </PageContent>
    </PageContainer>
  )
}
