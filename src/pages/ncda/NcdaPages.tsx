import { NcdaComingSoonPage } from '@/components/ncda/NcdaComingSoonPage'
import { ncda } from '@/locales/rw/ncda'

export { NcdaDashboardPage } from './NcdaDashboardPage'
export { NcdaDistrictsPage } from './NcdaDistrictsPage'
export { NcdaDistrictDetailPage } from './NcdaDistrictDetailPage'
export { NcdaCentersPage } from './NcdaCentersPage'
export { NcdaCenterDetailPage } from './NcdaCenterDetailPage'
export { NcdaChildrenPage } from './NcdaChildrenPage'
export { NcdaChildDetailPage } from './NcdaChildDetailPage'
export { NcdaUsersPage } from './NcdaUsersPage'
export { NcdaUserDetailPage } from './NcdaUserDetailPage'
export { NcdaAuditLogsPage } from './NcdaAuditLogsPage'
export { NcdaCompliancePage } from './NcdaCompliancePage'
export { NcdaWashPage } from './NcdaWashPage'
export { NcdaMonitoringPage } from './NcdaMonitoringPage'
export { NcdaReportsPage } from './NcdaReportsPage'

export function NcdaDevicesPage() {
  const section = ncda.sections.devices
  return (
    <NcdaComingSoonPage
      title={section.title}
      description={section.description}
      category={section.category}
    />
  )
}

export function NcdaSyncPage() {
  const section = ncda.sections.sync
  return (
    <NcdaComingSoonPage
      title={section.title}
      description={section.description}
      category={section.category}
    />
  )
}
