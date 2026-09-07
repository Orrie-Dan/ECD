import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AppContext'
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
    <PageContainer>
      <PageHeader title={district.nav.settings} subtitle={district.settings.subtitle} />
      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.settings.districtInfo}</h2>
            <dl>
              <InfoRow
                label={district.settings.districtName}
                value={user?.districtName?.trim() || '—'}
              />
            </dl>
          </Card>

          <Card padding="lg">
            <h2 className="text-subheading text-text mb-4">{district.settings.profileInfo}</h2>
            <dl>
              <InfoRow label={district.settings.userName} value={user?.name?.trim() || '—'} />
              <InfoRow label={district.settings.role} value={district.settings.roleOfficer} />
              <InfoRow label={district.settings.language} value={district.settings.languageValue} />
            </dl>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
