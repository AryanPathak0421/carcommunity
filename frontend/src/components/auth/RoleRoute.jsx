import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

/**
 * Restricts a route to specific `user.role` values (matches backend User.role enum).
 * Anonymous visitors are always sent to sign-in (there is no guest mode).
 */
export function RoleRoute({ allow, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/b2c/auth" replace state={{ from: location.pathname + location.search }} />
  }

  if (!allow?.length || !user?.role || !allow.includes(user.role)) {
    return <Navigate to="/app" replace />
  }
  
  return children
}
