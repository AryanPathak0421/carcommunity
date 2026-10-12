import Razorpay from 'razorpay'
import crypto from 'crypto'

let razorpayInstance = null

const isProduction = () => process.env.NODE_ENV === 'production'
const hasKeys = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

/**
 * Mock payments (no Razorpay keys) exist for local development only and need
 * ALLOW_MOCK_PAYMENTS=true. A missing key must fail closed, never "approve" a payment.
 */
export const isMockPaymentMode = () =>
  !hasKeys() && !isProduction() && process.env.ALLOW_MOCK_PAYMENTS === 'true'

const getRazorpayInstance = () => {
  if (!hasKeys()) return null
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayInstance
}

/** Rupees (may have paise) -> integer paise. */
export const toPaise = (rupees) => Math.round(Number(rupees) * 100)

export const createOrder = async (amount, currency = 'INR', receipt = 'receipt#1') => {
  const paise = toPaise(amount)
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error('Invalid payment amount')
  }

  const instance = getRazorpayInstance()
  if (!instance) {
    if (!isMockPaymentMode()) {
      const err = new Error('Online payments are not configured')
      err.statusCode = 503
      throw err
    }
    return {
      id: `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      amount: paise,
      currency,
      receipt,
      status: 'created',
      mock: true,
    }
  }

  return instance.orders.create({ amount: paise, currency, receipt })
}

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!hasKeys()) {
    // Dev-only mock mode: accept, but only outside production.
    return isMockPaymentMode()
  }
  if (typeof signature !== 'string' || !orderId || !paymentId) return false

  const digest = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  const a = Buffer.from(digest)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Refund a captured payment (full amount by default).
 * @returns {Promise<{ ok: boolean, mock?: boolean, refundId?: string, error?: string }>}
 */
export const refundPayment = async (paymentId, amountRupees) => {
  const instance = getRazorpayInstance()
  if (!instance) {
    return isMockPaymentMode() ? { ok: true, mock: true } : { ok: false, error: 'Payments not configured' }
  }
  if (!paymentId || String(paymentId).startsWith('pay_mock')) return { ok: true, mock: true }
  try {
    const payload = amountRupees ? { amount: toPaise(amountRupees) } : {}
    const refund = await instance.payments.refund(paymentId, payload)
    return { ok: true, refundId: refund?.id }
  } catch (err) {
    return { ok: false, error: err?.error?.description || err?.message || 'Refund failed' }
  }
}
