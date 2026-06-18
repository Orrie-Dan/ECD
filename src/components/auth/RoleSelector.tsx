import { useNavigate } from 'react-router-dom'
import { Landmark, Users } from 'lucide-react'
import { RoleSelectionCard } from '@/components/auth/RoleSelectionCard'
import { auth } from '@/locales/rw/auth'

export function RoleSelector() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4" role="group" aria-label={auth.roleSelection.welcomeTitle}>
      <RoleSelectionCard
        icon={Users}
        accent="caretaker"
        title={auth.roleSelection.caretaker.title}
        description={auth.roleSelection.caretaker.description}
        onSelect={() => navigate('/login/caretaker')}
      />
      <RoleSelectionCard
        icon={Landmark}
        accent="districtOfficer"
        title={auth.roleSelection.districtOfficer.title}
        description={auth.roleSelection.districtOfficer.description}
        onSelect={() => navigate('/login/district')}
      />
    </div>
  )
}
