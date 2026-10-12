/** Roles: Individual (customer), Mechanic (service provider), Admin */
export const USER_ROLES = {
  INDIVIDUAL: 'individual',
  MECHANIC: 'mechanic',
  ADMIN: 'admin',
}

export const ROLE_LIST = Object.values(USER_ROLES)

/** Roles that use mobile-first app experience (not web-admin focused) */
export const APP_ROLES = [
  USER_ROLES.INDIVIDUAL,
  USER_ROLES.MECHANIC,
]

export const ADMIN_ROLES = [
  USER_ROLES.ADMIN,
]

export const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
}
