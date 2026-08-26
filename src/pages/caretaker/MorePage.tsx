import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  UtensilsCrossed,
  Accessibility,
  BarChart3,
  Settings,
  ClipboardCheck,
  Users,
  ArrowLeftRight,
  Building2,
  Settings2,
  BookOpen,
} from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ActionCard } from '@/components/ui/Card'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/contexts/AppContext'
import { isEcdDirector } from '@/api/roles'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'

const hubItems = [
  {
    path: CARETAKER_PATHS.register,
    title: caretaker.nav.register,
    description: caretaker.more.registerDesc,
    icon: UserPlus,
    accent: 'green' as const,
    directorOnly: false,
  },
  {
    path: CARETAKER_PATHS.imirire,
    title: caretaker.nav.imirire,
    description: caretaker.more.imirireDesc,
    icon: UtensilsCrossed,
    accent: 'amber' as const,
    directorOnly: false,
  },
  {
    path: CARETAKER_PATHS.sted,
    title: caretaker.nav.sted,
    description: caretaker.more.stedDesc,
    icon: Accessibility,
    accent: 'blue' as const,
    directorOnly: false,
  },
  {
    path: CARETAKER_PATHS.ikigo,
    title: caretaker.director.nav.ikigo,
    description: caretaker.director.ikigo.subtitle,
    icon: Building2,
    accent: 'teal' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.book,
    title: caretaker.director.nav.book,
    description: caretaker.director.book.subtitle,
    icon: BookOpen,
    accent: 'amber' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.management,
    title: caretaker.director.nav.management,
    description: caretaker.director.management.subtitle,
    icon: Settings2,
    accent: 'blue' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.users,
    title: caretaker.nav.users,
    description: caretaker.more.usersDesc,
    icon: Users,
    accent: 'blue' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.selfEval,
    title: caretaker.selfEval.title,
    description: caretaker.selfEval.startDesc,
    icon: ClipboardCheck,
    accent: 'green' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.transfers,
    title: caretaker.nav.transfers,
    description: caretaker.more.transfersDesc,
    icon: ArrowLeftRight,
    accent: 'teal' as const,
    directorOnly: true,
  },
  {
    path: CARETAKER_PATHS.reports,
    title: caretaker.nav.reports,
    description: caretaker.more.reportsDesc,
    icon: BarChart3,
    accent: 'green' as const,
    directorOnly: false,
  },
  {
    path: CARETAKER_PATHS.settings,
    title: caretaker.nav.settings,
    description: caretaker.more.settingsDesc,
    icon: Settings,
    accent: 'amber' as const,
    directorOnly: false,
  },
]

export function MorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const director = isEcdDirector(user)
  const items = hubItems.filter((item) => !item.directorOnly || director)

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader title={caretaker.more.title} description={caretaker.more.subtitle} />
        <PageContent className="space-y-3">
          {items.map((item) => {
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
