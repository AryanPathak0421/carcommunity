import { Navigate, useLocation } from 'react-router-dom'
import { USER_ROLES } from '../../constants/userRoles.js'
import { isBootRole, readBootRole } from '../../lib/bootPersona.js'
import { AUTH_PATHS } from '../../constants/bootFlow.js'

/**
 * Legacy `/b2c/auth` and `/auth` entry. Forwards to the customer or mechanic page based on the
 * role the visitor picked (router state, then the stored boot role), defaulting to customer.
 * Router state (e.g. `from`) is preserved.
 */
export function AuthRedirect() {
  const location = useLocation()
  const stateRole = location.state?.defaultRole
  const role = isBootRole(stateRole) ? stateRole : readBootRole()
  const target = role === USER_ROLES.MECHANIC ? AUTH_PATHS.MECHANIC : AUTH_PATHS.USER
  return <Navigate to={target} replace state={location.state} />
}
