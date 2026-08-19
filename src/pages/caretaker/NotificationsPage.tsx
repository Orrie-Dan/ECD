import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { NotificationsPageContent } from '@/pages/shared/NotificationsPage'

export function CaretakerNotificationsPage() {
  return (
    <CaretakerLayout>
      <NotificationsPageContent rolePrefix="/caretaker" />
    </CaretakerLayout>
  )
}
