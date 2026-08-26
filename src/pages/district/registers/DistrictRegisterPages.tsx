import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { ActionCard, Card } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SupervisoryReadOnlyBanner } from '@/components/caretaker/register'
import {
  DISTRICT_REGISTER_SECTIONS,
  DistrictRegisterScopeFilters,
  findSupervisoryRegisterSection,
} from '@/components/registers'
import { env } from '@/config/env'
import { useDistrictScope } from '@/features/district/overview/useDistrictScope'
import { useDistrictCaregiverCenterOptions } from '@/features/district/users/queries'
import { district } from '@/locales/rw/district'
import { caretaker } from '@/locales/rw/caretaker'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'

const copy = district.registers

export function DistrictRegisterHubPage() {
  const navigate = useNavigate()

  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader title={copy.hubTitle} description={copy.hubSubtitle} size="compact" />
        <PageContent>
          <LiveUnavailableState title={copy.mockOnlyTitle} description={copy.mockOnlyBody} />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={copy.hubTitle} description={copy.hubSubtitle} size="compact" />
      <PageContent className="space-y-4">
        <Card padding="md" className="border-primary/20 bg-primary-light/20">
          <div className="flex items-start gap-3">
            <BookOpen size={22} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-body text-text-secondary">{caretaker.director.book.hubHint}</p>
          </div>
        </Card>
        {DISTRICT_REGISTER_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <ActionCard
              key={section.id}
              icon={<Icon size={24} strokeWidth={2.25} aria-hidden="true" />}
              title={`${section.paperSection}. ${section.title}`}
              description={section.subtitle}
              accent="amber"
              onClick={() => navigate(`${DISTRICT_PATHS.book}/${section.pathSegment}`)}
            />
          )
        })}
      </PageContent>
    </PageContainer>
  )
}

export function DistrictRegisterSectionPage() {
  const { section: sectionSegment } = useParams<{ section: string }>()
  const section = findSupervisoryRegisterSection(
    DISTRICT_REGISTER_SECTIONS,
    sectionSegment ?? '',
  )
  const { districtId } = useDistrictScope()
  const [centerId, setCenterId] = useState('all')
  const centers = useDistrictCaregiverCenterOptions()

  const scope = useMemo(
    () => ({
      districtId: districtId ?? undefined,
      centerId: centerId === 'all' ? undefined : centerId,
    }),
    [districtId, centerId],
  )

  const centerOptions = useMemo(
    () =>
      (centers.data?.items ?? []).map((center) => ({
        id: center.id,
        name: center.name,
      })),
    [centers.data?.items],
  )

  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={section?.title ?? copy.hubTitle}
          description={section?.subtitle}
          badge={section ? `Igice ${section.paperSection}` : undefined}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState title={copy.mockOnlyTitle} description={copy.mockOnlyBody} />
        </PageContent>
      </PageContainer>
    )
  }

  if (!section) {
    return (
      <PageContainer>
        <PageContent>
          <LiveUnavailableState title={copy.hubTitle} />
        </PageContent>
      </PageContainer>
    )
  }

  const List = section.List

  return (
    <PageContainer>
      <PageHeader
        title={section.title}
        description={section.subtitle}
        badge={`Igice ${section.paperSection}`}
        size="compact"
      />
      <PageContent className="space-y-4">
        <SupervisoryReadOnlyBanner message={copy.readOnlyHint} />
        <DistrictRegisterScopeFilters
          centerId={centerId}
          onCenterIdChange={setCenterId}
          centerOptions={centerOptions}
          centersLoading={centers.isLoading}
        />
        <List scope={scope} />
      </PageContent>
    </PageContainer>
  )
}
