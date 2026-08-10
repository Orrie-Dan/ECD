import { useState, type FormEvent } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/FormField'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useAuth } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { ATTENDANCE_THRESHOLD } from '@/lib/mock-data'
import { LATE_ARRIVAL_CUTOFF } from '@/lib/attendance-utils'
import { district } from '@/locales/rw/district'
import { common, messages } from '@/locales/rw/common'

type FieldErrors = Partial<Record<'name' | 'threshold' | 'lateCutoff', string>>

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

export function DistrictSettingsPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [threshold, setThreshold] = useState(String(ATTENDANCE_THRESHOLD))
  const [lateCutoff, setLateCutoff] = useState(LATE_ARRIVAL_CUTOFF)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!name.trim()) {
      next.name = district.settings.userNameRequired
    }

    const thresholdValue = Number(threshold)
    if (!threshold.trim()) {
      next.threshold = district.settings.thresholdRequired
    } else if (
      !Number.isFinite(thresholdValue) ||
      !Number.isInteger(thresholdValue) ||
      thresholdValue < 1 ||
      thresholdValue > 100
    ) {
      next.threshold = district.settings.thresholdInvalid
    }

    if (!lateCutoff.trim()) {
      next.lateCutoff = district.settings.lateCutoffRequired
    } else if (!TIME_PATTERN.test(lateCutoff)) {
      next.lateCutoff = district.settings.lateCutoffInvalid
    }

    return next
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    if (env.isLive) {
      showError(messages.liveSettingsUnavailable)
      return
    }
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showError(messages.formIncomplete)
      return
    }

    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      // Mocked persistence — intentionally no backend write (MOCK only).
      showSuccess(district.settings.saveSuccess)
    }, 350)
  }

  return (
    <DistrictLayout>
      <PageContainer>
        <PageHeader title={district.nav.settings} subtitle={district.settings.subtitle} />
        <PageContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <h2 className="text-subheading text-text mb-4">{district.settings.districtInfo}</h2>
              <dl>
                <InfoRow label={district.settings.districtName} value={user?.districtName ?? '—'} />
                <InfoRow label={district.settings.role} value={district.settings.roleOfficer} />
                <InfoRow label={district.settings.appVersion} value="1.0.0" />
                <InfoRow label={district.settings.language} value={district.settings.languageValue} />
              </dl>
            </Card>

            <Card padding="lg" className="lg:row-span-2">
              <h2 className="text-subheading text-text mb-1">{district.settings.profileInfo}</h2>
              <p className="text-caption text-text-muted mb-5">
                {env.isLive ? common.live.settingsSaveUnavailable : district.settings.mockNote}
              </p>

              {env.isLive ? (
                <LiveUnavailableState
                  compact
                  title={common.live.settingsSaveUnavailable}
                  description={common.live.unavailableDesc}
                  className="mb-5"
                />
              ) : null}

              <form onSubmit={handleSave} className="space-y-6" noValidate>
                <FormField label={district.settings.userName} required error={errors.name}>
                  <TextInput
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                    placeholder={district.settings.userNamePlaceholder}
                    error={!!errors.name}
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                  />
                </FormField>

                <div className="space-y-3">
                  <h3 className="text-body font-semibold text-text">{district.settings.threshold}</h3>
                  <p className="text-body text-text-secondary">{district.settings.thresholdDesc}</p>
                  <FormField
                    label={district.settings.thresholdLabel}
                    required
                    error={errors.threshold}
                  >
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={threshold}
                      onChange={(e) => {
                        setThreshold(e.target.value)
                        if (errors.threshold) setErrors((prev) => ({ ...prev, threshold: undefined }))
                      }}
                      error={!!errors.threshold}
                      aria-invalid={!!errors.threshold}
                    />
                  </FormField>
                </div>

                <div className="space-y-3">
                  <h3 className="text-body font-semibold text-text">{district.settings.lateCutoff}</h3>
                  <p className="text-body text-text-secondary">{district.settings.lateCutoffDesc}</p>
                  <FormField
                    label={district.settings.lateCutoffLabel}
                    required
                    error={errors.lateCutoff}
                  >
                    <TextInput
                      type="time"
                      value={lateCutoff}
                      onChange={(e) => {
                        setLateCutoff(e.target.value)
                        if (errors.lateCutoff) setErrors((prev) => ({ ...prev, lateCutoff: undefined }))
                      }}
                      error={!!errors.lateCutoff}
                      aria-invalid={!!errors.lateCutoff}
                    />
                  </FormField>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" variant="primary" size="md" disabled={isSaving || env.isLive}>
                    {isSaving ? common.loading : district.settings.save}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </PageContent>
      </PageContainer>
    </DistrictLayout>
  )
}
