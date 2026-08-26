import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, ClipboardCheck, ArrowLeftRight } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { DirectorRegisterShell } from '@/components/caretaker/DirectorRegisterShell'
import { DirectorRegisterOverview } from '@/components/caretaker/DirectorRegisterOverview'
import { ActionCard, Card } from '@/components/ui/Card'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { env } from '@/config/env'
import { caretaker } from '@/locales/rw/caretaker'
import {
  BOOK_SECTIONS,
  CARETAKER_PATHS,
  type BookSectionId,
} from '@/layouts/caretaker/navigation'

export function DirectorIkigoPage() {
  const { user } = useAuth()
  const copy = caretaker.director.ikigo
  const overviewCopy = caretaker.director.registerOverview
  const centerId = user?.centerId?.trim() ?? ''

  return (
    <CaretakerLayout pageTitle={copy.title}>
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} />
        <PageContent className="space-y-4">
          <Card elevated padding="lg">
            <div className="space-y-3">
              <p className="text-body font-semibold text-text">{copy.overviewTitle}</p>
              <p className="text-body text-text-secondary max-w-2xl">{copy.overviewBody}</p>
              <dl className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-xl bg-background-subtle px-4 py-3">
                  <dt className="text-caption text-text-muted">{copy.centerLabel}</dt>
                  <dd className="text-body font-semibold text-text mt-0.5">{user?.centerName ?? '—'}</dd>
                </div>
                <div className="rounded-xl bg-background-subtle px-4 py-3">
                  <dt className="text-caption text-text-muted">{copy.roleLabel}</dt>
                  <dd className="text-body font-semibold text-text mt-0.5">
                    {caretaker.settings.roleDirector}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <section aria-labelledby="register-overview-heading" className="space-y-3">
            <div>
              <h2 id="register-overview-heading" className="text-subheading text-text">
                {overviewCopy.title}
              </h2>
              <p className="text-caption text-text-muted">{overviewCopy.subtitle}</p>
            </div>
            {!env.isLive ? (
              <LiveUnavailableState
                title={overviewCopy.mockOnlyTitle}
                description={overviewCopy.mockOnlyBody}
              />
            ) : centerId ? (
              <DirectorRegisterOverview centerId={centerId} />
            ) : (
              <LiveUnavailableState title={caretaker.director.contributions.missingCenter} />
            )}
          </section>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}

const managementItems = [
  {
    path: CARETAKER_PATHS.users,
    title: caretaker.nav.users,
    description: caretaker.director.management.usersDesc,
    icon: Users,
    accent: 'blue' as const,
  },
  {
    path: CARETAKER_PATHS.selfEval,
    title: caretaker.selfEval.title,
    description: caretaker.director.management.selfEvalDesc,
    icon: ClipboardCheck,
    accent: 'green' as const,
  },
  {
    path: CARETAKER_PATHS.transfers,
    title: caretaker.nav.transfers,
    description: caretaker.director.management.transfersDesc,
    icon: ArrowLeftRight,
    accent: 'teal' as const,
  },
]

export function DirectorManagementPage() {
  const navigate = useNavigate()
  const copy = caretaker.director.management

  return (
    <CaretakerLayout pageTitle={copy.title}>
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} />
        <PageContent className="space-y-3">
          {managementItems.map((item) => {
            const Icon = item.icon
            return (
              <ActionCard
                key={item.path}
                icon={<Icon size={24} strokeWidth={2.25} aria-hidden="true" />}
                title={item.title}
                description={item.description}
                accent={item.accent}
                onClick={() => navigate(item.path)}
              />
            )
          })}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}

export function DirectorBookHubPage() {
  const navigate = useNavigate()
  const copy = caretaker.director.book

  return (
    <CaretakerLayout pageTitle={copy.title}>
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} />
        <PageContent className="space-y-3">
          <Card padding="md" className="border-primary/20 bg-primary-light/20">
            <div className="flex items-start gap-3">
              <BookOpen size={22} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-body text-text-secondary">{copy.hubHint}</p>
            </div>
          </Card>
          {BOOK_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <ActionCard
                key={section.id}
                icon={<Icon size={24} strokeWidth={2.25} aria-hidden="true" />}
                title={`${section.paperSection}. ${section.label}`}
                description={section.description}
                accent="amber"
                onClick={() => navigate(section.path)}
              />
            )
          })}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}

function DirectorBookSectionRoute({ sectionId }: { sectionId: BookSectionId }) {
  const { user } = useAuth()
  const section = BOOK_SECTIONS.find((item) => item.id === sectionId)

  if (!section) {
    return null
  }

  return (
    <CaretakerLayout
      pageTitle={section.label}
      backTo={CARETAKER_PATHS.book}
      backLabel={caretaker.director.nav.book}
    >
      <DirectorRegisterShell
        title={section.label}
        description={section.description}
        paperSection={section.paperSection}
        canMutate={canDirectorMutate(user)}
      />
    </CaretakerLayout>
  )
}

export function DirectorBookParentContributionsPage() {
  // FE-2: real workflow lives in ParentContributionsPage (wired in App.tsx).
  return <DirectorBookSectionRoute sectionId="parentContributions" />
}

export function DirectorBookEnvironmentTalksPage() {
  return <DirectorBookSectionRoute sectionId="environmentTalks" />
}

export function DirectorBookCommitteePage() {
  return <DirectorBookSectionRoute sectionId="committee" />
}

export function DirectorBookStaffPage() {
  return <DirectorBookSectionRoute sectionId="staff" />
}

export function DirectorBookSupportPage() {
  // FE-5: real workflow lives in CenterSupportPage (wired in App.tsx).
  return <DirectorBookSectionRoute sectionId="support" />
}

export function DirectorBookVisitorsPage() {
  // FE-5: real workflow lives in CenterVisitorsPage (wired in App.tsx).
  return <DirectorBookSectionRoute sectionId="visitors" />
}

export function DirectorBookTrainingPage() {
  // FE-6: real workflow lives in StaffTrainingsPage (wired in App.tsx).
  return <DirectorBookSectionRoute sectionId="training" />
}
