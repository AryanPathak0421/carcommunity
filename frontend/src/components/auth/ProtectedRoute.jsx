import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { getRoleHomePath } from '../../lib/roleHomePath.js'
import { AppRouteLoader } from '../app/AppRouteLoader.jsx'

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()
  const role = user?.role

  if (loading) {
    return <AppRouteLoader />
  }

  if (!isAuthenticated) {
    // Mechanic-only areas send visitors to the mechanic login; everything else to the customer one.
    const defaultRole = roles?.length === 1 ? roles[0] : undefined
    return (
      <Navigate
        to="/b2c/auth"
        replace
        state={{ from: location.pathname + location.search, defaultRole }}
      />
    )
  }

  if (isAuthenticated && roles?.length && role && !roles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />
  }

  return children
}
