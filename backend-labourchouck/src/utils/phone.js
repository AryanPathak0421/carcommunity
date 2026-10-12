/**
 * Demo accounts with a fixed OTP. These are a login backdoor, so they only exist when
 * explicitly enabled (ENABLE_TEST_ACCOUNTS=true) AND never in production.
 */
const TEST_ACCOUNTS = {
  '1111111111': { otp: '123456', role: 'individual', fullName: 'Demo Individual User' },
  '2222222222': { otp: '123456', role: 'mechanic', fullName: 'Demo Mechanic User' },
}

export function isTestAccountsEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_TEST_ACCOUNTS === 'true'
}

/** Returns the demo-account config for a phone, or null when test accounts are off. */
export function getTestAccount(phone) {
  if (!isTestAccountsEnabled()) return null
  return Object.prototype.hasOwnProperty.call(TEST_ACCOUNTS, phone) ? TEST_ACCOUNTS[phone] : null
}

/** Phones of the demo accounts (empty when disabled). */
export function listTestAccountPhones() {
  return isTestAccountsEnabled() ? Object.keys(TEST_ACCOUNTS) : []
}

/** Normalise to 10-digit Indian mobile without country code. */
export function normalizeIndianPhone(input) {
  if (input == null || typeof input !== 'string') return null
  let p = input.replace(/\D/g, '')
  if (p.length === 12 && p.startsWith('91')) p = p.slice(2)
  if (p.length === 11 && p.startsWith('0')) p = p.slice(1)
  if (p.length !== 10) return null
  if (getTestAccount(p)) return p
  if (!/^[6-9]/.test(p)) return null
  return p
}
