import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AppContext'
import { hasRole, homePathForUser } from '@/api/roles'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  allowedRole?: UserRole
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-body text-text-secondary">
        …
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (allowedRole && !hasRole(user, allowedRole)) {
    return <Navigate to={homePathForUser(user)} replace />
  }

  return <Outlet />
}
