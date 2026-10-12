import { KYC_STATUS, USER_ROLES } from '../constants/userRoles.js'

export const BOOT_ROLE_STORAGE_KEY = 'lc_boot_role'

const BOOT_ROLES = [USER_ROLES.INDIVIDUAL, USER_ROLES.MECHANIC]

export function isBootRole(role) {
  return BOOT_ROLES.includes(role)
}

export function readBootRole() {
  if (typeof localStorage === 'undefined') return null
  const role = localStorage.getItem(BOOT_ROLE_STORAGE_KEY)
  return isBootRole(role) ? role : null
}

export function writeBootRole(role) {
  if (typeof localStorage === 'undefined') return
  if (!isBootRole(role)) {
    localStorage.removeItem(BOOT_ROLE_STORAGE_KEY)
    return
  }
  localStorage.setItem(BOOT_ROLE_STORAGE_KEY, role)
}

export function clearBootRole() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(BOOT_ROLE_STORAGE_KEY)
}

/** Minimal in-app user for guest preview (no API token). */
export function buildGuestUser(role) {
  const base = {
    id: 'guest',
    fullName: 'Guest',
    phone: '',
    role,
  }

  if (role === USER_ROLES.MECHANIC) {
    return {
      ...base,
      labourProfile: {
        categoryIds: ['guest-preview'],
        kycStatus: KYC_STATUS.PENDING,
      },
    }
  }

  return base
}
