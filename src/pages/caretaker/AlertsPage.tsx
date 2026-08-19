import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { AlertsPageContent } from '@/pages/shared/AlertsPage'
import { useAuth } from '@/contexts/AppContext'

export function CaretakerAlertsPage() {
  const { user } = useAuth()
  return (
    <CaretakerLayout>
      <AlertsPageContent rolePrefix="/caretaker" centerId={user?.centerId ?? undefined} />
    </CaretakerLayout>
  )
}
