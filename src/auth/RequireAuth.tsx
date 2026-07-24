import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, homeForRole } from './AuthContext'
import type { Role } from '../lib/api'

export function RequireAuth({
  roles,
  children,
}: {
  roles?: Role[]
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="portal page-enter">
        <div className="portal__wrap" style={{ paddingTop: '8rem' }}>
          <p className="eyebrow">Loading…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return children
}
