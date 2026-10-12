import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

/**
 * Restricts a route to specific `user.role` values (matches backend User.role enum).
 * If `allowGuest` is true, unauthenticated users can access the route.
 */
export function RoleRoute({ allow, allowGuest, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    if (allowGuest) return children
    return <Navigate to="/b2c/auth" replace state={{ from: location.pathname + location.search }} />
  }

  if (!allow?.length || !user?.role || !allow.includes(user.role)) {
    return <Navigate to="/app" replace />
  }
  
  return children
}
