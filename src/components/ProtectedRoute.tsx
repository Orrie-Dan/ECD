import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AppContext'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  allowedRole?: UserRole
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (allowedRole && user?.role !== allowedRole) {
    const redirect = user?.role === 'caretaker' ? '/caretaker' : '/district'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
