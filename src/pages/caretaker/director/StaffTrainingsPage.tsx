import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterPaginationFooter,
  RegisterReadOnlyBanner,
  RegisterTableCell,
  RegisterTableHeadCell,
  RegisterTableWrap,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { StaffTrainingFormDialog } from '@/components/staff-trainings/StaffTrainingFormDialog'
import { StaffTrainingViewSheet } from '@/components/staff-trainings/StaffTrainingViewSheet'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCreateStaffTraining,
  useStaffTrainingsList,
  useUpdateStaffTraining,
} from '@/features/staff-trainings'
import { useCenterUsersList } from '@/features/caretaker/users/queries'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CreateStaffTrainingInput,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'
import type { CenterUserResponse } from '@/api/resources/users'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import {
  formatCertificateStatus,
  formatTrainingDuration,
} from '@/lib/staff-training-format'
import { formatRegisterDate } from '@/lib/register-format'

const copy = caretaker.director.trainings

export function StaffTrainingsPage() {
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
        <StaffTrainingsLive />
      )}
    </CaretakerLayout>
  )
}

function StaffTrainingsLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [traineeUserId, setTraineeUserId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<StaffTrainingViewModel | null>(null)
  const [viewing, setViewing] = useState<StaffTrainingViewModel | null>(null)

  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId,
      from: range.from,
      to: range.to,
      traineeUserId: traineeUserId || undefined,
      page,
      pageSize,
    }),
    [centerId, range.from, range.to, traineeUserId, page, pageSize],
  )

  const list = useStaffTrainingsList(listFilters, Boolean(centerId))
  const caregivers = useCenterUsersList(
    { centerId, page: 1, pageSize: 100, status: 'ACTIVE' },
    Boolean(centerId),
  )
  const createMutation = useCreateStaffTraining()
  const updateMutation = useUpdateStaffTraining(editing?.id ?? '')

  const traineeOptions = useMemo(() => {
    const rows = (caregivers.data?.items ?? caregivers.data?.data ?? []) as CenterUserResponse[]
    return rows.map((row) => ({ id: row.id, fullName: row.fullName }))
  }, [caregivers.data])

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(record: StaffTrainingViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateStaffTrainingInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateStaffTrainingInput) {
    if (!editing) return
    try {
      await updateMutation.mutateAsync(input)
      setFormOpen(false)
      setEditing(null)
      showSuccess(copy.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  if (!centerId) {
    return (
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} badge={copy.paperBadge} />
        <PageContent>
          <LiveUnavailableState title={copy.missingCenter} />
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
            <Button variant="primary" size="sm" icon={<Plus size={18} />} onClick={openCreate}>
              {copy.add}
            </Button>
          ) : undefined
        }
      />
      <PageContent className="space-y-4">
        {!canMutate && <RegisterReadOnlyBanner />}

        <RegisterFiltersCard>
          <div className="grid gap-3 sm:grid-cols-2">
            <RegisterMonthFilter
              label={copy.monthLabel}
              value={yearMonth}
              onChange={(value) => {
                setYearMonth(value)
                setPage(1)
              }}
            />
            <FormField label={copy.traineeFilter}>
              <SelectInput
                value={traineeUserId}
                onChange={(e) => {
                  setTraineeUserId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{copy.traineeAll}</option>
                {traineeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
        </RegisterFiltersCard>

        <RegisterListPanel
          isLoading={list.isLoading}
          isError={list.isError}
          isEmpty={items.length === 0}
          emptyTitle={traineeUserId ? copy.emptyFiltered : copy.empty}
          emptyDescription={traineeUserId ? undefined : copy.emptyDesc}
          emptyAction={
            canMutate ? (
              <Button variant="primary" icon={<Plus size={18} />} onClick={openCreate}>
                {copy.add}
              </Button>
            ) : undefined
          }
          errorTitle={copy.listError}
          onRetry={() => void list.refetch()}
        >
          <>
            <RegisterTableWrap>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <RegisterTableHeadCell>{copy.colDate}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colTrainee}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colProvider}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colTopic}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colDuration}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colCertificate}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <RegisterTableCell label={copy.colDate}>
                      {formatRegisterDate(row.trainingDate)}
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colTrainee}>
                      <p className="font-semibold">{row.traineeName}</p>
                      <p className="text-caption text-text-muted">{row.traineeRole}</p>
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colProvider}>
                      {row.trainingProvider}
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colTopic}>
                      {row.topic}
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colDuration}>
                      {formatTrainingDuration(row.durationDays)}
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colCertificate}>
                      <Badge variant={row.certificateReceived ? 'success' : 'neutral'}>
                        {formatCertificateStatus(row.certificateReceived)}
                      </Badge>
                    </RegisterTableCell>
                    <RegisterTableCell label={copy.colActions}>
                      <RegisterViewEditActions
                        viewLabel={copy.view}
                        onView={() => setViewing(row)}
                        canMutate={canMutate}
                        onEdit={() => openEdit(row)}
                      />
                    </RegisterTableCell>
                  </tr>
                ))}
              </tbody>
            </RegisterTableWrap>
            <RegisterPaginationFooter>
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                total={total}
                startIndex={startIndex}
                endIndex={endIndex}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </RegisterPaginationFooter>
          </>
        </RegisterListPanel>
      </PageContent>

      <StaffTrainingFormDialog
        open={formOpen}
        mode={formMode}
        centerId={centerId}
        record={editing}
        traineeOptions={traineeOptions}
        busy={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <StaffTrainingViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={canMutate}
        onClose={() => setViewing(null)}
        onEdit={
          viewing
            ? () => {
                openEdit(viewing)
              }
            : undefined
        }
      />
    </PageContainer>
  )
}
