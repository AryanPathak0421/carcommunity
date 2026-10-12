import { useAuth } from './useAuth.js'
import { USER_ROLES } from '../constants/userRoles.js'
import { writeBootRole } from '../lib/bootPersona.js'

/**
 * Shared CTA handlers for the landing page. Entries reuse the guest
 * "boot persona" flow (customer or mechanic).
 */
export function useLandingCta() {
  const { user, logout } = useAuth()

  const enterAsBootRole = (role) => (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (user && user.role === role) {
      window.location.href = '/app'
      return
    }
    logout().finally(() => {
      writeBootRole(role)
      window.location.href = '/app'
    })
  }

  return {
    bookMechanic: enterAsBootRole(USER_ROLES.INDIVIDUAL),
    registerMechanic: enterAsBootRole(USER_ROLES.MECHANIC),
  }
}
