import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'

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

  return (
    <CaretakerLayout>
      <p className="text-body-lg text-text-secondary mb-8">{caretaker.settings.subtitle}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{caretaker.settings.centerInfo}</h2>
          <dl>
            <InfoRow label={caretaker.settings.centerName} value={user?.centerName ?? '—'} />
          </dl>
        </Card>

        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{caretaker.settings.userInfo}</h2>
          <dl>
            <InfoRow label={caretaker.settings.userName} value={user?.name ?? '—'} />
            <InfoRow label={caretaker.settings.role} value={caretaker.settings.roleCaretaker} />
          </dl>
        </Card>

        <Card padding="lg" className="lg:col-span-2">
          <h2 className="text-subheading text-text mb-4">{caretaker.settings.appInfo}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <InfoRow label={caretaker.settings.appVersion} value="1.0.0" />
            <InfoRow label={caretaker.settings.language} value={caretaker.settings.languageValue} />
          </dl>
        </Card>
      </div>
    </CaretakerLayout>
  )
}
