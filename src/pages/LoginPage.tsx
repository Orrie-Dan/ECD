import { Navigate, useParams } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { auth } from '@/locales/rw/auth'
import type { UserRole } from '@/types'

const LOGIN_ROLE_MAP: Record<string, UserRole> = {
  caretaker: 'caretaker',
  district: 'districtOfficer',
}

export function LoginPage() {
  const { role: roleParam } = useParams<{ role: string }>()
  const role = roleParam ? LOGIN_ROLE_MAP[roleParam] : undefined

  if (!role) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9FC] px-4 py-8 sm:px-6 sm:py-12 w-full min-w-0">
      <LoginForm role={role} />

      <footer className="mt-8 text-center max-w-md">
        <p className="text-body text-text-muted">{auth.login.governmentFooterLine1}</p>
        <p className="text-body text-text-muted mt-1">{auth.login.governmentFooterLine2}</p>
      </footer>
    </main>
  )
}
