import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { USER_ROLES } from '../constants/userRoles.js'
import { writeBootRole } from '../lib/bootPersona.js'

/**
 * Shared CTA handlers for the landing page. A signed-in user of the same role goes straight to
 * the app; everyone else is taken to sign-in / sign-up with that role preselected.
 */
export function useLandingCta() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const enter = (role) => (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (user && user.role === role) {
      navigate('/app')
      return
    }
    writeBootRole(role)
    navigate('/b2c/auth', { state: { defaultRole: role } })
  }

  return {
    bookMechanic: enter(USER_ROLES.INDIVIDUAL),
    registerMechanic: enter(USER_ROLES.MECHANIC),
  }
}
