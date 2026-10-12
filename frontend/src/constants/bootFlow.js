/**
 * Mobile app bootstrap flow (splash → role select → guest or auth home).
 * Marketing `/` and admin `/admin/login` are outside this chain.
 */

export const BOOT_ROUTES = {
  SPLASH: '/splash',
  /** Phase 2 — dedicated role selection before auth */
  ROLE_SELECT: '/onboarding/role',
  AUTH: '/auth',
}

/** Minimum time splash stays visible (ms) */
export const SPLASH_MIN_DURATION_MS = 2200
