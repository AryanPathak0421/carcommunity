import { AuthEntryPage } from './AuthEntryPage.jsx'
import { USER_ROLES } from '../../constants/userRoles.js'

/** Mechanic sign in / sign up — `/mechanic/auth` */
export function MechanicAuthPage() {
  return <AuthEntryPage audience={USER_ROLES.MECHANIC} />
}
