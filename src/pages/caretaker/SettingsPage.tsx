import { useState, type FormEvent } from 'react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { PendingSyncPanel } from '@/components/offline/SyncStatusIndicator'
import { useAuth } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { isValidRwandaPhone } from '@/lib/child-form'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages } from '@/locales/rw/common'

type LanguagePreference = 'rw'

type FieldErrors = Partial<Record<'name' | 'phone' | 'language', string>>

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('0788123456')
  const [language, setLanguage] = useState<LanguagePreference>('rw')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!name.trim()) {
      next.name = caretaker.settings.userNameRequired
    }
    if (!phone.trim()) {
      next.phone = caretaker.settings.phoneRequired
    } else if (!isValidRwandaPhone(phone)) {
      next.phone = caretaker.settings.phoneInvalid
    }
    if (!language) {
      next.language = caretaker.settings.languageRequired
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
      // Mocked persistence — intentionally no backend / auth update (MOCK only).
      showSuccess(caretaker.settings.saveSuccess)
    }, 350)
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader title={caretaker.settings.title} description={caretaker.settings.subtitle} />
        <PageContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <h2 className="text-subheading text-text mb-4">{caretaker.settings.centerInfo}</h2>
              <dl>
                <InfoRow label={caretaker.settings.centerName} value={user?.centerName ?? '—'} />
                <InfoRow label={caretaker.settings.role} value={caretaker.settings.roleCaretaker} />
                <InfoRow label={caretaker.settings.appVersion} value="1.0.0" />
              </dl>
            </Card>

            {env.isLive && (
              <Card padding="lg">
                <PendingSyncPanel />
              </Card>
            )}

            <Card padding="lg">
              <h2 className="text-subheading text-text mb-1">{caretaker.settings.profileInfo}</h2>
              <p className="text-caption text-text-muted mb-5">
                {env.isLive ? common.live.settingsSaveUnavailable : caretaker.settings.mockNote}
              </p>

              {env.isLive ? (
                <LiveUnavailableState
                  compact
                  title={common.live.settingsSaveUnavailable}
                  description={common.live.unavailableDesc}
                  className="mb-5"
                />
              ) : null}

              <form onSubmit={handleSave} className="space-y-5" noValidate>
                <FormField label={caretaker.settings.userName} required error={errors.name}>
                  <TextInput
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                    placeholder={caretaker.settings.userNamePlaceholder}
                    error={!!errors.name}
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                  />
                </FormField>

                <FormField label={caretaker.settings.phone} required error={errors.phone}>
                  <TextInput
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
                    }}
                    placeholder={caretaker.settings.phonePlaceholder}
                    error={!!errors.phone}
                    autoComplete="tel"
                    aria-invalid={!!errors.phone}
                  />
                </FormField>

                <FormField
                  label={caretaker.settings.language}
                  required
                  error={errors.language}
                  hint={caretaker.settings.languageHint}
                >
                  <SelectInput
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value as LanguagePreference)
                      if (errors.language) setErrors((prev) => ({ ...prev, language: undefined }))
                    }}
                    error={!!errors.language}
                    aria-invalid={!!errors.language}
                    aria-label={caretaker.settings.language}
                  >
                    <option value="rw">{caretaker.settings.languageRw}</option>
                  </SelectInput>
                </FormField>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" variant="primary" size="md" disabled={isSaving || env.isLive}>
                    {isSaving ? common.loading : caretaker.settings.save}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
