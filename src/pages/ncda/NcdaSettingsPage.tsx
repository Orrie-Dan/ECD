import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AppContext'
import { ncda } from '@/locales/rw/ncda'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

/**
 * Account + system settings hub. National device/sync consoles are not
 * available — described in plain language, not API contract jargon.
 */
export function NcdaSettingsPage() {
  const { user } = useAuth()

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.settings.title}
        subtitle={ncda.settingsPage.subtitle}
        size="compact"
      />
      <PageContent>
        <div className="space-y-4 max-w-3xl">
          <Card padding="md" className="border-border">
            <h2 className="text-subheading font-semibold text-text mb-3">
              {ncda.settingsPage.accountTitle}
            </h2>
            <dl>
              <InfoRow
                label={ncda.settingsPage.accountName}
                value={user?.name?.trim() || '—'}
              />
              <InfoRow label={ncda.settingsPage.accountRole} value={ncda.rolesPage.roleNcda} />
              <InfoRow
                label={ncda.settingsPage.accountLanguage}
                value={ncda.settingsPage.languageValue}
              />
            </dl>
          </Card>

          <Card padding="md" className="border-border space-y-1">
            <h2 className="text-subheading font-semibold text-text pb-2">
              {ncda.settingsPage.unavailableTitle}
            </h2>
            <div className="divide-y divide-border">
              <UnavailableRow
                title={ncda.settingsPage.nationalSettingsTitle}
                body={ncda.settingsPage.nationalSettingsBody}
              />
              <UnavailableRow
                title={ncda.settingsPage.devicesTitle}
                body={ncda.settingsPage.devicesBody}
              />
              <UnavailableRow
                title={ncda.settingsPage.syncTitle}
                body={ncda.settingsPage.syncBody}
              />
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}

function UnavailableRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1 py-3 first:pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-body font-semibold text-text">{title}</h3>
        <Badge variant="neutral">{ncda.settingsPage.comingSoonBadge}</Badge>
      </div>
      <p className="text-body text-text-secondary">{body}</p>
    </div>
  )
}
