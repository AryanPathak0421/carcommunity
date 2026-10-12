import { Router } from 'express'
import { validateRequest } from '../middleware/validateRequest.js'
import { protect } from '../middleware/auth.js'
import { adminLoginLimiter, authIpLimiter, otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimit.js'
import * as auth from '../controllers/authController.js'
import {
  validatePhoneBody,
  validateRoleRegister,
  validateOtpCode,
  validateOtpChallengeId,
  validateFullNameOptional,
  validateFullNameRequired,
  validateAdminLogin,
  validateReferralCodeOptional,
} from '../validators/authValidators.js'

const router = Router()

router.post(
  '/register/request-otp',
  authIpLimiter,
  otpRequestLimiter,
  [validatePhoneBody, validateRoleRegister, validateFullNameOptional],
  validateRequest,
  auth.registerRequestOtp,
)

router.post(
  '/register/verify',
  authIpLimiter,
  otpVerifyLimiter,
  [
    validatePhoneBody,
    validateRoleRegister,
    validateOtpChallengeId,
    validateOtpCode,
    validateFullNameRequired,
    validateReferralCodeOptional,
  ],
  validateRequest,
  auth.registerVerify,
)

router.post('/login/request-otp', authIpLimiter, otpRequestLimiter, [validatePhoneBody], validateRequest, auth.loginRequestOtp)

router.post('/login/verify', authIpLimiter, otpVerifyLimiter, [validatePhoneBody, validateOtpChallengeId, validateOtpCode], validateRequest, auth.loginVerify)

router.post('/admin/login', adminLoginLimiter, validateAdminLogin, validateRequest, auth.adminLogin)

router.get('/me', protect, auth.getMe)

router.post('/logout', auth.logout)

export default router
