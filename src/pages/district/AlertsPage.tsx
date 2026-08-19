import { AlertsPageContent } from '@/pages/shared/AlertsPage'
import { useAuth } from '@/contexts/AppContext'

export function DistrictAlertsPage() {
  const { user } = useAuth()
  return (
    <AlertsPageContent
      rolePrefix="/district"
      districtId={user?.districtId ?? undefined}
    />
  )
}
