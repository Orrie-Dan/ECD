import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { TempPasswordBanner } from '@/components/district/TempPasswordBanner'
import { StaffTrainingHistoryList } from '@/components/staff-trainings/StaffTrainingHistoryList'
import { StaffTrainingViewSheet } from '@/components/staff-trainings/StaffTrainingViewSheet'
import { StaffTrainingFormDialog } from '@/components/staff-trainings/StaffTrainingFormDialog'
import { CaregiverWorkExperienceHistoryList } from '@/components/caregiver-work-experiences/CaregiverWorkExperienceHistoryList'
import { CaregiverWorkExperienceFormDialog } from '@/components/caregiver-work-experiences/CaregiverWorkExperienceFormDialog'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import {
  useCenterResetUserPassword,
  useCenterUpdateUser,
  useCenterUserDetail,
} from '@/features/caretaker/users/queries'
import {
  useCreateStaffTraining,
  useUpdateStaffTraining,
} from '@/features/staff-trainings'
import {
  useCreateCaregiverWorkExperience,
  useUpdateCaregiverWorkExperience,
} from '@/features/caregiver-work-experiences/queries'
import { UserProfileEditForm } from '@/components/users/UserProfileEditForm'
import { caretaker } from '@/locales/rw/caretaker'
import { normalizeApiError } from '@/api/errors'
import type { UpdateUserDto } from '@/api/generated/models'
import type { CenterUserResponse } from '@/api/resources/users'
import {
  formatEducationLevel,
  formatPersonSex,
} from '@/lib/committee-educator-format'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CreateStaffTrainingInput,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'
import type {
  CaregiverWorkExperienceViewModel,
  CreateCaregiverWorkExperienceInput,
  UpdateCaregiverWorkExperienceInput,
} from '@/models/caregiver-work-experiences'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'

const USERS_PATH = '/caretaker/abakoresha'
const trainingsCopy = caretaker.director.trainings
const workCopy = caretaker.users.workExperience

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso.slice(0, 19)
  }
}

/**
 * ECD director — caregiver profile, status, password reset, and Amahugurwa yabonye.
 */
export function CenterUserDetailPage() {
  return (
    <CaretakerLayout>
      {!env.isLive ? (
        <PageContainer>
          <PageHeader
            title={caretaker.users.title}
            description={caretaker.users.detailSubtitle}
          />
          <PageContent>
            <LiveUnavailableState
              title={caretaker.users.mockOnlyTitle}
              description={caretaker.users.mockOnlyBody}
            />
          </PageContent>
        </PageContainer>
      ) : (
        <CenterUserDetailLive />
      )}
    </CaretakerLayout>
  )
}

function CenterUserDetailLive() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const queryClient = useQueryClient()
  const detail = useCenterUserDetail(userId)
  const [tempSecret, setTempSecret] = useState<string | null>(null)
  const [trainingPage, setTrainingPage] = useState(1)
  const [trainingPageSize, setTrainingPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [viewingTraining, setViewingTraining] = useState<StaffTrainingViewModel | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTraining, setEditingTraining] = useState<StaffTrainingViewModel | null>(null)
  const [workFormOpen, setWorkFormOpen] = useState(false)
  const [workFormMode, setWorkFormMode] = useState<'create' | 'edit'>('create')
  const [editingWork, setEditingWork] = useState<CaregiverWorkExperienceViewModel | null>(null)

  const canMutate = canDirectorMutate(user)
  const centerId = user?.centerId?.trim() || detail.data?.center?.id || ''
  const trainingFilters = useMemo(
    () => ({
      centerId,
      traineeUserId: userId,
      page: trainingPage,
      pageSize: trainingPageSize,
    }),
    [centerId, userId, trainingPage, trainingPageSize],
  )

  const createTraining = useCreateStaffTraining()
  const updateTraining = useUpdateStaffTraining(editingTraining?.id ?? '')
  const createWork = useCreateCaregiverWorkExperience(userId)
  const updateWork = useUpdateCaregiverWorkExperience(userId, editingWork?.id ?? '')

  function invalidateTrainings() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.staffTrainings.all })
  }

  const backLink = (
    <Link
      to={USERS_PATH}
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline"
    >
      <ArrowLeft size={14} aria-hidden />
      {caretaker.users.backToList}
    </Link>
  )

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <PageContainer>
        <PageHeader
          title={caretaker.users.title}
          description={caretaker.users.detailSubtitle}
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={is404 ? caretaker.users.notFound : caretaker.users.detailError}
            description={caretaker.users.scopeLabel}
            action={
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {caretaker.users.retry}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const title = detail.data?.fullName ?? caretaker.users.title
  const lockedTrainee =
    detail.data != null ? { id: detail.data.id, fullName: detail.data.fullName } : null

  async function onCreateTraining(input: CreateStaffTrainingInput) {
    try {
      await createTraining.mutateAsync(input)
      setFormOpen(false)
      showSuccess(trainingsCopy.createSuccess)
      invalidateTrainings()
    } catch (err) {
      showError(normalizeApiError(err).message || trainingsCopy.saveError)
    }
  }

  async function onUpdateTraining(input: UpdateStaffTrainingInput) {
    try {
      await updateTraining.mutateAsync(input)
      setFormOpen(false)
      setEditingTraining(null)
      setViewingTraining(null)
      showSuccess(trainingsCopy.updateSuccess)
      invalidateTrainings()
    } catch (err) {
      showError(normalizeApiError(err).message || trainingsCopy.saveError)
    }
  }

  async function onCreateWork(input: CreateCaregiverWorkExperienceInput) {
    try {
      await createWork.mutateAsync(input)
      setWorkFormOpen(false)
      showSuccess(workCopy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || workCopy.saveError)
    }
  }

  async function onUpdateWork(input: UpdateCaregiverWorkExperienceInput) {
    try {
      await updateWork.mutateAsync(input)
      setWorkFormOpen(false)
      setEditingWork(null)
      showSuccess(workCopy.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || workCopy.saveError)
    }
  }

  return (
    <PageContainer>
      <PageHeader title={title} description={caretaker.users.detailSubtitle} />
      <PageContent>
        <div className="mb-4 space-y-2">
          {backLink}
          <p className="text-caption text-text-secondary">{caretaker.users.scopeLabel}</p>
        </div>

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

          {detail.isLoading && !detail.data ? (
            <Skeleton height="8rem" className="w-full" rounded="md" />
          ) : detail.data ? (
            <>
              <Card padding="md" className="border-border">
                <h2 className="text-subheading font-semibold text-text mb-3">
                  {caretaker.users.identityTitle}
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                  <Field label={caretaker.users.colUsername} value={detail.data.username} />
                  <Field label={caretaker.users.colFullName} value={detail.data.fullName} />
                  <Field label={caretaker.users.colPhone} value={detail.data.phone ?? '—'} />
                  <Field label={caretaker.users.colEmail} value={detail.data.email ?? '—'} />
                  <Field
                    label={caretaker.director.educators.gender}
                    value={formatPersonSex((detail.data as CenterUserResponse).gender)}
                  />
                  <Field
                    label={caretaker.director.educators.educationLevel}
                    value={formatEducationLevel(
                      (detail.data as CenterUserResponse).educationLevel,
                    )}
                  />
                  <Field
                    label={caretaker.users.colStatus}
                    value={
                      detail.data.status === 'ACTIVE'
                        ? caretaker.users.statusActive
                        : caretaker.users.statusSuspended
                    }
                  />
                  <Field
                    label={caretaker.users.colCreated}
                    value={formatDate(detail.data.createdAt)}
                  />
                </dl>
                <p className="mt-3 text-caption text-text-muted">{caretaker.users.roleFixed}</p>
              </Card>

              <Card padding="md" className="border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-subheading font-semibold text-text">
                    {trainingsCopy.receivedTitle}
                  </h2>
                  {canMutate ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={16} />}
                      onClick={() => {
                        setFormMode('create')
                        setEditingTraining(null)
                        setFormOpen(true)
                      }}
                    >
                      {trainingsCopy.add}
                    </Button>
                  ) : null}
                </div>
                <StaffTrainingHistoryList
                  filters={trainingFilters}
                  enabled={Boolean(centerId && userId)}
                  emptyTitle={trainingsCopy.receivedEmpty}
                  page={trainingPage}
                  pageSize={trainingPageSize}
                  onPageChange={setTrainingPage}
                  onPageSizeChange={(size) => {
                    setTrainingPageSize(size)
                    setTrainingPage(1)
                  }}
                  onSelect={setViewingTraining}
                />
              </Card>

              <StaffTrainingViewSheet
                open={Boolean(viewingTraining)}
                record={viewingTraining}
                canMutate={canMutate}
                onClose={() => setViewingTraining(null)}
                onEdit={
                  canMutate
                    ? () => {
                        if (!viewingTraining) return
                        setEditingTraining(viewingTraining)
                        setViewingTraining(null)
                        setFormMode('edit')
                        setFormOpen(true)
                      }
                    : undefined
                }
              />

              <StaffTrainingFormDialog
                open={formOpen}
                mode={formMode}
                centerId={centerId}
                record={editingTraining}
                traineeOptions={lockedTrainee ? [lockedTrainee] : []}
                lockedTrainee={formMode === 'create' ? lockedTrainee : null}
                busy={createTraining.isPending || updateTraining.isPending}
                onClose={() => {
                  setFormOpen(false)
                  setEditingTraining(null)
                }}
                onCreate={onCreateTraining}
                onUpdate={onUpdateTraining}
              />

              <Card padding="md" className="border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-subheading font-semibold text-text">{workCopy.title}</h2>
                  {canMutate ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={16} />}
                      onClick={() => {
                        setWorkFormMode('create')
                        setEditingWork(null)
                        setWorkFormOpen(true)
                      }}
                    >
                      {workCopy.add}
                    </Button>
                  ) : null}
                </div>
                <CaregiverWorkExperienceHistoryList
                  userId={userId}
                  enabled={Boolean(userId)}
                  onSelect={
                    canMutate
                      ? (record) => {
                          setEditingWork(record)
                          setWorkFormMode('edit')
                          setWorkFormOpen(true)
                        }
                      : undefined
                  }
                />
              </Card>

              <CaregiverWorkExperienceFormDialog
                open={workFormOpen}
                mode={workFormMode}
                record={editingWork}
                busy={createWork.isPending || updateWork.isPending}
                onClose={() => {
                  setWorkFormOpen(false)
                  setEditingWork(null)
                }}
                onCreate={onCreateWork}
                onUpdate={onUpdateWork}
              />

              <CaregiverEditForm
                key={`${detail.data.id}:${detail.data.updatedAt}`}
                userId={userId}
                initial={detail.data}
                onSaved={() => void detail.refetch()}
                onTempPassword={setTempSecret}
                showError={showError}
                showSuccess={showSuccess}
              />
            </>
          ) : null}
        </div>
      </PageContent>
    </PageContainer>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-semibold text-text-secondary">{label}</dt>
      <dd className="mt-0.5 font-medium text-text">{value}</dd>
    </div>
  )
}

function CaregiverEditForm({
  userId,
  initial,
  onSaved,
  onTempPassword,
  showError,
  showSuccess,
}: {
  userId: string
  initial: CenterUserResponse
  onSaved: () => void
  onTempPassword: (secret: string) => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
}) {
  const updateMutation = useCenterUpdateUser(userId)
  const resetMutation = useCenterResetUserPassword(userId)

  async function onSave(dto: UpdateUserDto) {
    try {
      await updateMutation.mutateAsync(dto)
      showSuccess(caretaker.users.updateSuccess)
      onSaved()
    } catch (err) {
      showError(normalizeApiError(err).message || caretaker.users.updateError)
    }
  }

  async function onResetPassword() {
    try {
      const result = await resetMutation.mutateAsync(undefined)
      if (result.temporaryPassword) {
        onTempPassword(result.temporaryPassword)
      }
      showSuccess(caretaker.users.resetSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || caretaker.users.resetError)
    }
  }

  return (
    <Card padding="md" className="border-border space-y-4">
      <h2 className="text-subheading font-semibold text-text">{caretaker.users.editTitle}</h2>
      <UserProfileEditForm
        initial={initial}
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
        }}
        pending={updateMutation.isPending}
        onSubmit={onSave}
        extraActions={
          <Button
            type="button"
            variant="secondary"
            loading={resetMutation.isPending}
            disabled={resetMutation.isPending}
            onClick={() => void onResetPassword()}
          >
            {caretaker.users.resetPassword}
          </Button>
        }
      />
    </Card>
  )
}
