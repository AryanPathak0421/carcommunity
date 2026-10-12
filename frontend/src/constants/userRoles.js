/** Keep in sync with backend `src/constants/roles.js` */
export const USER_ROLES = {
  INDIVIDUAL: 'individual',
  MECHANIC: 'mechanic',
  ADMIN: 'admin',
}

/** Same as backend `ROLE_LIST` */
export const ROLE_LIST = Object.values(USER_ROLES)

export const REGISTERABLE_ROLES = [USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]

/** Mobile-first app roles — keep in sync with backend `src/constants/roles.js` (`APP_ROLES`) */
export const APP_ROLES = [USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]

export const ROLE_LABELS = {
  [USER_ROLES.INDIVIDUAL]: 'Customer',
  [USER_ROLES.MECHANIC]: 'Mechanic',
  [USER_ROLES.ADMIN]: 'Administrator',
}

/** Mirror backend `KYC_STATUS` for UI badges */
export const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
}
