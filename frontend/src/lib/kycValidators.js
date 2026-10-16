/** Client-side format checks for mechanic onboarding — mirrors backend `utils/kycValidators.js`. */

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

export function digitsOnly(value, max = 12) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, max)
}

export function alnumUpper(value, max) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, max)
}

export function isValidAadhaar(digits12) {
  if (!/^[2-9]\d{11}$/.test(digits12)) return false
  let c = 0
  const reversed = digits12.split('').reverse().map(Number)
  for (let i = 0; i < reversed.length; i++) c = D[c][P[i % 8][reversed[i]]]
  return c === 0
}

export const isValidPan = (pan) => /^[A-Z]{5}\d{4}[A-Z]$/.test(pan)

/** e.g. MH1420110062821 — state (2) + RTO (2) + year (4) + serial (7) */
export const isValidDrivingLicence = (dl) => /^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/.test(dl)

export const isValidPincode = (pin) => /^[1-9]\d{5}$/.test(pin)

export const isValidMobile = (phone) => /^[6-9]\d{9}$/.test(phone)

export const isValidVehicleReg = (reg) => /^[A-Z0-9]{6,11}$/.test(reg)

/** True when a YYYY-MM-DD string is a real date strictly after today. */
export function isFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T23:59:59`)
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now()
}
