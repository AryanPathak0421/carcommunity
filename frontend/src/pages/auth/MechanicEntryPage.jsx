import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AppRouteLoader } from '../../components/app/AppRouteLoader.jsx'
import { USER_ROLES } from '../../constants/userRoles.js'
import { useAuth } from '../../hooks/useAuth.js'
import { writeBootRole } from '../../lib/bootPersona.js'

/**
 * Launch screen of the installed mechanic app (`/mechanic` or `/partner`, the PWA start_url):
 * a signed-in mechanic goes straight to the work dashboard, anyone else to mechanic sign-in.
 */
export function MechanicEntryPage() {
  const { loading, token, realUser, logout } = useAuth()

  useEffect(() => {
    // If signed in as Customer, clear the conflicting session so Partner app starts clean
    if (realUser?.role && realUser.role !== USER_ROLES.MECHANIC) {
      logout().then(() => {
        writeBootRole(USER_ROLES.MECHANIC)
      })
    }
  }, [realUser, logout])

  if (loading || (token && !realUser)) return <AppRouteLoader />

  if (realUser?.role === USER_ROLES.MECHANIC) return <Navigate to="/app" replace />

  writeBootRole(USER_ROLES.MECHANIC)
  return <Navigate to="/mechanic/auth" replace />
}
