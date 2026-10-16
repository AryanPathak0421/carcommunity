/**
 * Format checks for mechanic onboarding documents. These only catch typos — a document is
 * "verified" when an admin reviews the uploaded photos and video (no government API is wired in).
 */

const VERHOEFF_D = [
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
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

/** Aadhaar numbers carry a Verhoeff check digit and never start with 0 or 1. */
export function isValidAadhaarChecksum(digits12) {
  if (!/^[2-9]\d{11}$/.test(digits12)) return false
  let c = 0
  const reversed = digits12.split('').reverse().map(Number)
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]]
  }
  return c === 0
}

export function normalizeAlnum(input, max) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, max)
}

/** Driving licence: state code (2 letters) + RTO (2 digits) + year (4) + serial (7), e.g. MH1420110062821. */
export function normalizeDrivingLicence(input) {
  return normalizeAlnum(input, 15)
}

export function isValidDrivingLicence(normalized) {
  return /^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/.test(normalized)
}

export function maskDrivingLicence(normalized) {
  return `${normalized.slice(0, 4)} XXXXXXX ${normalized.slice(-4)}`
}

/** Returns a Date at the end of that day (UTC), or null when invalid. */
export function parseDateOnly(input) {
  const s = String(input ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d
}

export function isValidPincode(input) {
  return /^[1-9]\d{5}$/.test(String(input ?? ''))
}

export function isValidVehicleRegNo(normalized) {
  return /^[A-Z0-9]{6,11}$/.test(normalized)
}
