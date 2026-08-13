import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
  useDistrictCaregiverDetail,
  useDistrictResetCaregiverPassword,
  useDistrictUpdateCaregiver,
} from '@/features/district/users/queries'
import { district } from '@/locales/rw/district'
import { normalizeApiError } from '@/api/errors'
import type { ApiUserStatus, UserResponseDto } from '@/api/generated/models'

const CAREGIVERS_PATH = '/district/abakoresha'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso.slice(0, 19)
  }
}

/**
 * District caregiver detail — profile/status update + password reset.
 */
export function DistrictCaregiverDetailPage() {
  if (!env.isLive) {
    return (
      <>
        <PageContainer>
          <PageHeader
            title={district.caregivers.title}
            subtitle={district.caregivers.detailSubtitle}
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

  return <DistrictCaregiverDetailLive />
}

function DistrictCaregiverDetailLive() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { showError, showSuccess } = useToast()
  const detail = useDistrictCaregiverDetail(userId)
  const [tempSecret, setTempSecret] = useState<string | null>(null)

  const backLink = (
    <Link
      to={CAREGIVERS_PATH}
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline"
    >
      <ArrowLeft size={14} aria-hidden />
      {district.caregivers.backToList}
    </Link>
  )

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <>
        <PageContainer>
          <PageHeader
            title={district.caregivers.title}
            subtitle={district.caregivers.detailSubtitle}
            size="compact"
          />
          <PageContent>
            <div className="mb-3">{backLink}</div>
            <LiveUnavailableState
              title={is404 ? district.caregivers.notFound : district.caregivers.detailError}
              description={district.caregivers.scopeLabel}
              action={
                <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                  {district.caregivers.retry}
                </Button>
              }
            />
          </PageContent>
        </PageContainer>
      </>
    )
  }

  const title = detail.data?.fullName ?? district.caregivers.title

  return (
    <>
      <PageContainer>
        <PageHeader title={title} subtitle={district.caregivers.detailSubtitle} size="compact" />
        <PageContent>
          <div className="mb-4 space-y-2">
            {backLink}
            <p className="text-caption text-text-secondary">{district.caregivers.scopeLabel}</p>
          </div>

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

            {detail.isLoading && !detail.data ? (
              <Skeleton height="8rem" className="w-full" rounded="md" />
            ) : detail.data ? (
              <>
                <Card padding="md" className="border-border">
                  <h2 className="text-subheading font-semibold text-text mb-3">
                    {district.caregivers.identityTitle}
                  </h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                    <Field label={district.caregivers.colUsername} value={detail.data.username} />
                    <Field label={district.caregivers.colFullName} value={detail.data.fullName} />
                    <Field label={district.caregivers.colPhone} value={detail.data.phone ?? '—'} />
                    <Field label={district.caregivers.colStatus} value={detail.data.status} />
                    <Field
                      label={district.caregivers.colCenter}
                      value={
                        detail.data.center
                          ? `${detail.data.center.name} (${detail.data.center.code})`
                          : '—'
                      }
                    />
                    <Field
                      label={district.caregivers.colCreated}
                      value={formatDate(detail.data.createdAt)}
                    />
                  </dl>
                  <p className="mt-3 text-caption text-text-muted">{district.caregivers.roleFixed}</p>
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
    </>
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
  const updateMutation = useDistrictUpdateCaregiver(userId)
  const resetMutation = useDistrictResetCaregiverPassword(userId)
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
      showSuccess(district.caregivers.updateSuccess)
      onSaved()
    } catch (err) {
      showError(normalizeApiError(err).message || district.caregivers.updateError)
    }
  }

  async function onResetPassword() {
    try {
      const result = await resetMutation.mutateAsync(undefined)
      if (result.temporaryPassword) {
        onTempPassword(result.temporaryPassword)
      }
      showSuccess(district.caregivers.resetSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || district.caregivers.resetError)
    }
  }

  return (
    <Card padding="md" className="border-border space-y-4">
      <h2 className="text-subheading font-semibold text-text">{district.caregivers.editTitle}</h2>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={onSave}>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {district.caregivers.colFullName}
          </label>
          <TextInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {district.caregivers.colPhone}
          </label>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {district.caregivers.colStatus}
          </label>
          <SelectInput
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiUserStatus)}
          >
            <option value="ACTIVE">{district.caregivers.statusActive}</option>
            <option value="SUSPENDED">{district.caregivers.statusSuspended}</option>
          </SelectInput>
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            {district.caregivers.saveChanges}
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={resetMutation.isPending}
            disabled={resetMutation.isPending}
            onClick={() => void onResetPassword()}
          >
            {district.caregivers.resetPassword}
          </Button>
        </div>
      </form>
    </Card>
  )
}
