import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import {
  useNcdaResetUserPassword,
  useNcdaUpdateUser,
  useNcdaUserDetail,
} from '@/features/ncda/users/queries'
import { UserProfileEditForm } from '@/components/users/UserProfileEditForm'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { normalizeApiError } from '@/api/errors'
import type { PersonSex, UpdateUserDto, UserResponseDto } from '@/api/generated/models'

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso.slice(0, 19)
  }
}

/**
 * NCDA user detail — identity + profile/status update + password reset.
 * Role/scope changes are not offered (backend forbids on PATCH).
 */
export function NcdaUserDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.users.title}
          subtitle={ncda.users.detailSubtitle}
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

  return <NcdaUserDetailLive />
}

function NcdaUserDetailLive() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { showError, showSuccess } = useToast()
  const detail = useNcdaUserDetail(userId)
  const [tempSecret, setTempSecret] = useState<string | null>(null)

  const backLink = (
    <Link
      to={NCDA_PATHS.users}
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline"
    >
      <ArrowLeft size={14} aria-hidden />
      {ncda.users.backToList}
    </Link>
  )

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.users.title}
          subtitle={ncda.users.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={is404 ? ncda.users.notFound : ncda.users.detailError}
            description={ncda.users.detailError}
            action={
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {ncda.users.retry}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const title = detail.data?.fullName ?? ncda.sections.users.title

  return (
    <PageContainer>
      <PageHeader title={title} subtitle={ncda.users.detailSubtitle} size="compact" />
      <PageContent>
        <div className="mb-4 space-y-2">
          {backLink}
        </div>

        <div className="space-y-8">
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

          <NcdaDashboardSection
            title={ncda.users.identityTitle}
            isLoading={detail.isLoading && !detail.data}
            isError={false}
          >
            {detail.data ? (
              <Card padding="md" className="border-border">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                  <Field label={ncda.users.colUsername} value={detail.data.username} />
                  <Field label={ncda.users.colFullName} value={detail.data.fullName} />
                  <Field label={ncda.users.colPhone} value={detail.data.phone ?? '—'} />
                  <Field label={ncda.users.colEmail} value={detail.data.email ?? '—'} />
                  <Field
                    label={ncda.users.colGender}
                    value={genderLabel(detail.data.gender)}
                  />
                  <Field label={ncda.users.colRole} value={roleLabel(detail.data.role)} />
                  <Field label={ncda.users.colStatus} value={statusLabel(detail.data.status)} />
                  <Field
                    label={ncda.users.colDistrict}
                    value={detail.data.district?.name ?? '—'}
                  />
                  <Field
                    label={ncda.users.colCenter}
                    value={
                      detail.data.center
                        ? `${detail.data.center.name} (${detail.data.center.code})`
                        : '—'
                    }
                  />
                  <Field
                    label={ncda.users.colCreated}
                    value={formatDate(detail.data.createdAt)}
                  />
                  <Field
                    label={ncda.users.colUpdated}
                    value={formatDate(detail.data.updatedAt)}
                  />
                  <Field
                    label={ncda.users.colCreatedBy}
                    value={detail.data.createdBy?.username ?? '—'}
                  />
                </dl>
                <p className="mt-3 text-caption text-text-muted">{ncda.users.roleScopeLocked}</p>
              </Card>
            ) : (
              <Skeleton height="8rem" className="w-full" rounded="md" />
            )}
          </NcdaDashboardSection>

          {detail.data ? (
            <UserEditForm
              key={`${detail.data.id}:${detail.data.updatedAt}`}
              userId={userId}
              initial={detail.data}
              onSaved={() => void detail.refetch()}
              onTempPassword={setTempSecret}
              showError={showError}
              showSuccess={showSuccess}
            />
          ) : null}
        </div>
      </PageContent>
    </PageContainer>
  )
}

function UserEditForm({
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
  const updateMutation = useNcdaUpdateUser(userId)
  const resetMutation = useNcdaResetUserPassword(userId)

  async function onSave(dto: UpdateUserDto) {
    try {
      await updateMutation.mutateAsync(dto)
      showSuccess(ncda.users.updateSuccess)
      onSaved()
    } catch (err) {
      showError(normalizeApiError(err).message || ncda.users.updateError)
    }
  }

  async function onResetPassword() {
    try {
      const result = await resetMutation.mutateAsync(undefined)
      if (result.temporaryPassword) {
        onTempPassword(result.temporaryPassword)
      }
      showSuccess(ncda.users.resetSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || ncda.users.resetError)
    }
  }

  return (
    <Card padding="md" className="border-border space-y-4">
      <h2 className="text-subheading font-semibold text-text">{ncda.users.editTitle}</h2>
      <UserProfileEditForm
        initial={initial}
        labels={{
          fullName: ncda.users.colFullName,
          phone: ncda.users.colPhone,
          email: ncda.users.colEmail,
          gender: ncda.users.colGender,
          selectGender: ncda.users.selectGender,
          genderMale: ncda.users.genderMale,
          genderFemale: ncda.users.genderFemale,
          status: ncda.users.colStatus,
          statusActive: ncda.users.statusActive,
          statusSuspended: ncda.users.statusSuspended,
          save: ncda.users.saveChanges,
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
            {ncda.users.resetPassword}
          </Button>
        }
      />
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="font-semibold text-text">{value}</dd>
    </div>
  )
}

function genderLabel(gender: PersonSex | null | undefined): string {
  if (gender === 'male') return ncda.users.genderMale
  if (gender === 'female') return ncda.users.genderFemale
  return '—'
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
