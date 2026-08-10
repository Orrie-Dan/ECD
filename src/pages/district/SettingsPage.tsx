import { DistrictLayout } from '@/layouts/DistrictLayout'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AppContext'
import { ATTENDANCE_THRESHOLD } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

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

  return (
    <DistrictLayout>
      <p className="text-body-lg text-text-secondary mb-8">{district.settings.subtitle}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{district.settings.districtInfo}</h2>
          <dl>
            <InfoRow label={district.settings.districtName} value={user?.districtName ?? '—'} />
          </dl>
        </Card>

        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{district.settings.userInfo}</h2>
          <dl>
            <InfoRow label={district.settings.userName} value={user?.name ?? '—'} />
            <InfoRow label={district.settings.role} value={district.settings.roleOfficer} />
          </dl>
        </Card>

        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{district.settings.threshold}</h2>
          <p className="text-body text-text-secondary mb-3">{district.settings.thresholdDesc}</p>
          <p className="text-display text-primary">{ATTENDANCE_THRESHOLD}%</p>
        </Card>

        <Card padding="lg">
          <h2 className="text-subheading text-text mb-4">{district.settings.appInfo}</h2>
          <dl>
            <InfoRow label={district.settings.appVersion} value="1.0.0" />
            <InfoRow label={district.settings.language} value={district.settings.languageValue} />
          </dl>
        </Card>
      </div>
    </DistrictLayout>
  )
}
