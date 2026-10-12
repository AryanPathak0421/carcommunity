import { HTTP_STATUS, sendError } from '../utils/apiResponse.js'

/**
 * Small in-memory fixed-window rate limiter (single instance).
 * For multi-instance deployments swap the Map for a shared store (Redis).
 *
 * @param {{ windowMs: number, max: number, keyFn?: (req) => string, message?: string }} opts
 */
export function rateLimit({ windowMs, max, keyFn, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map()

  // Drop expired windows so the map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, Math.max(windowMs, 60_000))
  sweep.unref?.()

  return (req, res, next) => {
    // Local development / automated tests only; ignored in production.
    if (process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production') return next()
    const key = (keyFn ? keyFn(req) : req.ip) || 'anon'
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)))

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return sendError(res, {
        message,
        statusCode: 429,
        code: 'RATE_LIMITED',
      })
    }
    next()
  }
}

const byIpAndPhone = (req) => `${req.ip}:${String(req.body?.phone || '').replace(/\D/g, '').slice(-10)}`

/** OTP send: 5 per 10 min per IP+phone. */
export const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyFn: byIpAndPhone,
  message: 'Too many OTP requests. Please wait a few minutes and try again.',
})

/** OTP / password verify: 15 per 10 min per IP+phone, plus 40 per IP. */
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyFn: byIpAndPhone,
  message: 'Too many attempts. Please wait a few minutes and try again.',
})
export const authIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  keyFn: (req) => req.ip,
  message: 'Too many attempts from this network. Please try again later.',
})

/** Admin login: 10 per 15 min per IP+email. */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts. Please try again later.',
})
