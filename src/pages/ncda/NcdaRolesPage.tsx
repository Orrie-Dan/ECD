import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { NCDA_CREATABLE_ROLES } from '@/api/resources/users'
import { ncda } from '@/locales/rw/ncda'

const ROLES = [
  {
    id: 'ncda_admin',
    label: ncda.rolesPage.roleNcda,
    portal: ncda.rolesPage.roleNcdaPortal,
    scope: ncda.rolesPage.roleNcdaScope,
    create: ncda.rolesPage.roleNcdaCreate,
    notes: ncda.rolesPage.roleNcdaNotes,
  },
  {
    id: 'district_focal_person',
    label: ncda.rolesPage.roleDfp,
    portal: ncda.rolesPage.roleDfpPortal,
    scope: ncda.rolesPage.roleDfpScope,
    create: ncda.rolesPage.roleDfpCreate,
    notes: ncda.rolesPage.roleDfpNotes,
  },
  {
    id: 'caregiver',
    label: ncda.rolesPage.roleCaregiver,
    portal: ncda.rolesPage.roleCaregiverPortal,
    scope: ncda.rolesPage.roleCaregiverScope,
    create: ncda.rolesPage.roleCaregiverCreate,
    notes: ncda.rolesPage.roleCaregiverNotes,
  },
] as const

/**
 * Read-only role matrix. There is no /roles API — this documents the
 * existing create-role contract used by Users administration.
 */
export function NcdaRolesPage() {
  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.roles.title}
        subtitle={ncda.rolesPage.subtitle}
        size="compact"
      />
      <PageContent>
        <p className="mb-4 text-body text-text-secondary">{ncda.rolesPage.intro}</p>

        <Card padding="md" className="border-border overflow-x-auto">
          <table className="w-full min-w-0 sm:min-w-[40rem] text-left text-body responsive-table-cards">
            <thead>
              <tr className="border-b border-border text-caption text-text-secondary">
                <th className="py-2 pr-3 font-semibold">{ncda.rolesPage.colRole}</th>
                <th className="py-2 pr-3 font-semibold">{ncda.rolesPage.colPortal}</th>
                <th className="py-2 pr-3 font-semibold">{ncda.rolesPage.colScope}</th>
                <th className="py-2 pr-3 font-semibold">{ncda.rolesPage.colCreate}</th>
                <th className="py-2 font-semibold">{ncda.rolesPage.colNotes}</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role.id} className="border-b border-border/70 align-top">
                  <td className="py-2.5 pr-3 font-medium" data-label={ncda.rolesPage.colRole}>{role.label}</td>
                  <td className="py-2.5 pr-3" data-label={ncda.rolesPage.colPortal}>{role.portal}</td>
                  <td className="py-2.5 pr-3" data-label={ncda.rolesPage.colScope}>{role.scope}</td>
                  <td className="py-2.5 pr-3" data-label={ncda.rolesPage.colCreate}>{role.create}</td>
                  <td className="py-2.5 text-text-secondary" data-label={ncda.rolesPage.colNotes}>{role.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <p className="mt-4 text-caption text-text-muted">
          NCDA_CREATABLE_ROLES: {NCDA_CREATABLE_ROLES.join(', ')}
        </p>
        <Link
          to={NCDA_PATHS.users}
          className="mt-3 inline-block text-body font-semibold text-primary hover:underline"
        >
          {ncda.rolesPage.manageUsers}
        </Link>
      </PageContent>
    </PageContainer>
  )
}
