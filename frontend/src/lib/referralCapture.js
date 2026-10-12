/**
 * Refer & Earn link capture.
 *
 * A shared link looks like https://mappto.com/?ref=K7QM4XR2. The code is
 * pulled off the URL on any public page and parked in localStorage so it
 * survives the walk to the signup screen, then sent with register/verify.
 */

const STORAGE_KEY = 'lc_referral_code'

function normalize(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16)
}

/**
 * Read `?ref=` (or `?referral=`) from the current URL and remember it.
 * @returns {string} the captured code, or '' when there was none
 */
export function captureReferralCodeFromUrl() {
  if (typeof window === 'undefined') return ''
  try {
    const params = new URLSearchParams(window.location.search)
    const code = normalize(params.get('ref') || params.get('referral'))
    if (code.length >= 4) {
      window.localStorage.setItem(STORAGE_KEY, code)
      return code
    }
  } catch {
    // Private mode or a blocked storage API — the flow still works without it.
  }
  return ''
}

/** @returns {string} the stored code, or '' */
export function readStoredReferralCode() {
  if (typeof window === 'undefined') return ''
  try {
    return normalize(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return ''
  }
}

export function storeReferralCode(code) {
  const value = normalize(code)
  try {
    if (value.length >= 4) window.localStorage.setItem(STORAGE_KEY, value)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return value
}

/** Called after a successful signup so the code is not reused. */
export function clearStoredReferralCode() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Builds the link a user shares. */
export function buildReferralLink(code) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`
}
