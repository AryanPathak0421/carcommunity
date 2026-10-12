import { USER_ROLES } from '../constants/userRoles.js'

/** Post-login / wrong-panel redirect target per role */
export function getRoleHomePath(role) {
  if (role === USER_ROLES.ADMIN) return '/admin'
  return '/app'
}
