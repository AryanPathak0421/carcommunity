import { AuthEntryPage } from './AuthEntryPage.jsx'
import { USER_ROLES } from '../../constants/userRoles.js'

/** Customer sign in / sign up — `/user/auth` */
export function UserAuthPage() {
  return <AuthEntryPage audience={USER_ROLES.INDIVIDUAL} />
}
