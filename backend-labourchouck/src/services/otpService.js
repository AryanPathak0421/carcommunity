import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { OtpChallenge } from '../models/OtpChallenge.js'
import { normalizeIndianPhone, getTestAccount } from '../utils/phone.js'
import { sendOtpSms } from './smsService.js'

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

function generateSixDigitCode() {
  return String(crypto.randomInt(100000, 1000000))
}

/**
 * Demo mode: OTP = last 6 digits of the mobile number.
 * Off unless OTP_BYPASS_LAST6=true is set explicitly, and never in production
 * (a missing NODE_ENV must not silently turn this on).
 */
export function isOtpBypassLast6Enabled() {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.OTP_BYPASS_LAST6 === 'true'
}

export function otpFromPhoneLast6(phone) {
  const normalized = normalizeIndianPhone(phone) || String(phone || '').replace(/\D/g, '').slice(-10)
  const digits = normalized.replace(/\D/g, '')
  if (digits.length < 6) return null
  return digits.slice(-6)
}

/**
 * Fixed OTP for every account (OTP_FIXED_CODE=123456). Meant for demos / before SMS is live:
 * anyone who knows a phone number can sign in as it. Honoured in any NODE_ENV when set.
 */
export function getFixedOtpCode() {
  const c = String(process.env.OTP_FIXED_CODE || '').trim()
  return /^\d{6}$/.test(c) ? c : null
}

function resolvePlainOtpCode(phone) {
  const fixed = getFixedOtpCode()
  if (fixed) return fixed
  const testAccount = getTestAccount(phone)
  if (testAccount) return testAccount.otp
  if (isOtpBypassLast6Enabled()) {
    const bypass = otpFromPhoneLast6(phone)
    if (bypass) return bypass
  }
  return generateSixDigitCode()
}

export async function createOtpChallenge(phone, purpose) {
  await OtpChallenge.deleteMany({ phone, purpose })
  const plain = resolvePlainOtpCode(phone)
  const codeHash = await bcrypt.hash(plain, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)
  const created = await OtpChallenge.create({ phone, purpose, codeHash, expiresAt })

  // The plain OTP is only ever printed outside production and only when asked for.
  const printOtpForTesting = process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_LOG === 'true'
  if (printOtpForTesting) {
    const mode = getTestAccount(phone)
      ? `test-account-${getTestAccount(phone).role}`
      : isOtpBypassLast6Enabled()
        ? 'last-6-of-phone'
        : 'random'
    console.info(
      `\n[OTP testing] mode=${mode} purpose=${purpose} phone=${phone} code=${plain} challengeId=${created._id}\n`,
    )
  }

  // No real SMS for test accounts or while demo bypass is active.
  const skipSms = Boolean(getFixedOtpCode()) || Boolean(getTestAccount(phone)) || isOtpBypassLast6Enabled()
  if (!skipSms || process.env.SMS_SEND_ALWAYS === 'true') {
    sendOtpSms(phone, plain).catch((err) =>
      console.error('[otpService] sendOtpSms unexpected error:', err.message),
    )
  }

  return { expiresAt, challengeId: created._id.toString() }
}

/**
 * Validates OTP for a specific challenge issued by createOtpChallenge.
 * On success, returns the challenge document — caller must delete it only after DB work succeeds.
 * Every code path (including test accounts) goes through the same challenge + attempt limit.
 */
export async function validateOtpChallenge({ phone, purpose, code, challengeId }) {
  const submitted = String(code || '').trim()

  if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) {
    return { ok: false, reason: 'INVALID_CHALLENGE' }
  }

  const doc = await OtpChallenge.findOne({ _id: challengeId, phone, purpose })
  if (!doc) {
    return { ok: false, reason: 'NO_OTP' }
  }
  if (doc.expiresAt < new Date()) {
    await doc.deleteOne()
    return { ok: false, reason: 'EXPIRED' }
  }
  if (doc.attempts >= MAX_ATTEMPTS) {
    await doc.deleteOne()
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' }
  }

  const match = await bcrypt.compare(submitted, doc.codeHash)
  if (!match) {
    doc.attempts += 1
    await doc.save()
    return { ok: false, reason: 'INVALID_CODE' }
  }

  return { ok: true, doc }
}

export async function deleteOtpChallengeDoc(doc) {
  if (doc && typeof doc.deleteOne === 'function') {
    await doc.deleteOne()
  }
}
