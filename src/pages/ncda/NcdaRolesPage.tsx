import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { NCDA_CREATABLE_ROLES } from '@/api/resources/users'
import { UserRole } from '@/api/generated/models'
import { ncda } from '@/locales/rw/ncda'

const ROLES = [
  {
    id: UserRole.ncda_admin,
    label: ncda.rolesPage.roleNcda,
    portal: ncda.rolesPage.roleNcdaPortal,
    scope: ncda.rolesPage.roleNcdaScope,
    notes: ncda.rolesPage.roleNcdaNotes,
  },
  {
    id: UserRole.district_focal_person,
    label: ncda.rolesPage.roleDfp,
    portal: ncda.rolesPage.roleDfpPortal,
    scope: ncda.rolesPage.roleDfpScope,
    notes: ncda.rolesPage.roleDfpNotes,
  },
  {
    id: UserRole.ecd_director,
    label: ncda.rolesPage.roleDirector,
    portal: ncda.rolesPage.roleDirectorPortal,
    scope: ncda.rolesPage.roleDirectorScope,
    notes: ncda.rolesPage.roleDirectorNotes,
  },
  {
    id: UserRole.caregiver,
    label: ncda.rolesPage.roleCaregiver,
    portal: ncda.rolesPage.roleCaregiverPortal,
    scope: ncda.rolesPage.roleCaregiverScope,
    notes: ncda.rolesPage.roleCaregiverNotes,
  },
] as const

/**
 * Read-only role guide for NCDA admins — what each role can access
 * and which accounts NCDA can create.
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
        <p className="mb-4 max-w-3xl text-body text-text-secondary">{ncda.rolesPage.intro}</p>

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ROLES.map((role) => {
            const canCreate = NCDA_CREATABLE_ROLES.includes(role.id)
            return (
              <li key={role.id}>
                <Card padding="md" className="border-border h-full space-y-3">
                  <h2 className="text-subheading font-semibold text-text">{role.label}</h2>
                  <dl className="space-y-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-text-secondary">{ncda.rolesPage.colPortal}</dt>
                      <dd className="text-body text-text text-right">{role.portal}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-text-secondary">{ncda.rolesPage.colScope}</dt>
                      <dd className="text-body text-text text-right">{role.scope}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-text-secondary">{ncda.rolesPage.colCreate}</dt>
                      <dd className="text-body font-medium text-text text-right">
                        {canCreate ? ncda.rolesPage.createYes : ncda.rolesPage.createNo}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-caption text-text-secondary">{role.notes}</p>
                </Card>
              </li>
            )
          })}
        </ul>

        <Link
          to={NCDA_PATHS.users}
          className="mt-5 inline-block text-body font-semibold text-primary hover:underline"
        >
          {ncda.rolesPage.manageUsers}
        </Link>
      </PageContent>
    </PageContainer>
  )
}
