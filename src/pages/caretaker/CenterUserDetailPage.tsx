import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { TempPasswordBanner } from '@/components/district/TempPasswordBanner'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import {
  useCenterResetUserPassword,
  useCenterUpdateUser,
  useCenterUserDetail,
} from '@/features/caretaker/users/queries'
import { caretaker } from '@/locales/rw/caretaker'
import { normalizeApiError } from '@/api/errors'
import type { ApiUserStatus, UserResponseDto } from '@/api/generated/models'

const USERS_PATH = '/caretaker/abakoresha'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso.slice(0, 19)
  }
}

/**
 * ECD director — caregiver profile, status, and password reset.
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
  const { showError, showSuccess } = useToast()
  const detail = useCenterUserDetail(userId)
  const [tempSecret, setTempSecret] = useState<string | null>(null)

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
                  <Field label={caretaker.users.colStatus} value={detail.data.status} />
                  <Field
                    label={caretaker.users.colCreated}
                    value={formatDate(detail.data.createdAt)}
                  />
                </dl>
                <p className="mt-3 text-caption text-text-muted">{caretaker.users.roleFixed}</p>
              </Card>

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
  initial: UserResponseDto
  onSaved: () => void
  onTempPassword: (secret: string) => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
}) {
  const updateMutation = useCenterUpdateUser(userId)
  const resetMutation = useCenterResetUserPassword(userId)
  const [fullName, setFullName] = useState(initial.fullName)
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [status, setStatus] = useState<ApiUserStatus>(initial.status)

  async function onSave(e: FormEvent) {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        status,
      })
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
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onSave}>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {caretaker.users.colFullName}
          </label>
          <TextInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {caretaker.users.colPhone}
          </label>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {caretaker.users.colStatus}
          </label>
          <SelectInput
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiUserStatus)}
          >
            <option value="ACTIVE">{caretaker.users.statusActive}</option>
            <option value="SUSPENDED">{caretaker.users.statusSuspended}</option>
          </SelectInput>
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            {caretaker.users.saveChanges}
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={resetMutation.isPending}
            disabled={resetMutation.isPending}
            onClick={() => void onResetPassword()}
          >
            {caretaker.users.resetPassword}
          </Button>
        </div>
      </form>
    </Card>
  )
}
