/**
 * Central security configuration: CORS origins and production start-up checks.
 */

/** Allowed browser origins. Never '*' with credentials: unset => same-origin only in production. */
export function getAllowedOrigins() {
  const raw = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (raw.length > 0) return raw
  // Dev convenience only; production requires CORS_ORIGIN (or a same-origin proxy, which needs no CORS).
  return process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5180']
}

export function corsOriginCheck(origin, cb) {
  // No Origin header => same-origin / server-to-server / curl: allow.
  if (!origin) return cb(null, true)
  return cb(null, getAllowedOrigins().includes(origin))
}

/** Refuse to boot in production with unsafe settings. */
export function assertProductionConfig() {
  const problems = []
  const secret = process.env.JWT_SECRET || ''
  if (secret.length < 32) problems.push('JWT_SECRET must be set to a random value of at least 32 characters')
  if (process.env.ENABLE_TEST_ACCOUNTS === 'true') problems.push('ENABLE_TEST_ACCOUNTS must not be true')
  if (process.env.OTP_BYPASS_LAST6 === 'true') problems.push('OTP_BYPASS_LAST6 must not be true')
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    problems.push('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET must be set (payments fail closed without them)')
  }
  if (!process.env.MONGODB_URI) problems.push('MONGODB_URI must be set')
  if (process.env.OTP_FIXED_CODE) {
    console.warn('[security] OTP_FIXED_CODE is set: every account accepts that OTP. Remove it once SMS login is live.')
  }
  if (problems.length) {
    throw new Error(`Unsafe production configuration:\n - ${problems.join('\n - ')}`)
  }
}
