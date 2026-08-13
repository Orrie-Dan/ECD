import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ncda } from '@/locales/rw/ncda'

/**
 * System settings hub. National settings / device fleet / sync console
 * APIs are not available — shown as honest contract gaps, not empty data.
 */
export function NcdaSettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.settings.title}
        subtitle={ncda.settingsPage.subtitle}
        size="compact"
      />
      <PageContent>
        <div className="space-y-4 max-w-3xl">
          <Card padding="md" className="border-border space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-subheading font-semibold text-text">
                {ncda.settingsPage.nationalSettingsTitle}
              </h2>
              <Badge variant="neutral">{ncda.settingsPage.comingSoonBadge}</Badge>
            </div>
            <p className="text-body text-text-secondary">{ncda.settingsPage.nationalSettingsBody}</p>
          </Card>
          <Card padding="md" className="border-border space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-subheading font-semibold text-text">
                {ncda.settingsPage.devicesTitle}
              </h2>
              <Badge variant="neutral">{ncda.settingsPage.comingSoonBadge}</Badge>
            </div>
            <p className="text-body text-text-secondary">{ncda.settingsPage.devicesBody}</p>
            <p className="text-caption text-text-muted">{ncda.sections.devices.description}</p>
          </Card>
          <Card padding="md" className="border-border space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-subheading font-semibold text-text">
                {ncda.settingsPage.syncTitle}
              </h2>
              <Badge variant="neutral">{ncda.settingsPage.comingSoonBadge}</Badge>
            </div>
            <p className="text-body text-text-secondary">{ncda.settingsPage.syncBody}</p>
            <p className="text-caption text-text-muted">{ncda.sections.sync.description}</p>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
