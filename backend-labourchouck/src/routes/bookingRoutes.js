import { Router } from 'express'
import mongoose from 'mongoose'
import { body } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as booking from '../controllers/bookingController.js'

const router = Router()

router.use(protect)

router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: 'Booking not found' })
  }
  next()
})

router.post(
  '/calculate',
  restrictTo(USER_ROLES.INDIVIDUAL),
  [
    body('serviceId').isMongoId().withMessage('Valid service ID required'),
  ],
  validateRequest,
  booking.calculateBill,
)

router.post(
  '/',
  restrictTo(USER_ROLES.INDIVIDUAL),
  [
    body('serviceId').isMongoId().withMessage('Valid service ID required'),
    body('durationDays').optional().isInt({ min: 1, max: 30 }).withMessage('durationDays must be 1-30'),
    body('durationKind').optional().isIn(['few_hours', 'full_day', 'multi_day']),
    body('lat').exists().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').exists().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('type').isIn(['INSTANT', 'SCHEDULED']).withMessage('Invalid booking type'),
    body('locationText').trim().notEmpty().withMessage('Location is required'),
    body('paymentMethod').isIn(['ONLINE', 'CASH']).withMessage('Invalid payment method'),
    body('useWallet').optional().isBoolean().withMessage('useWallet must be a boolean'),
  ],
  validateRequest,
  booking.createBooking,
)

router.get('/me', booking.getMyBookings)
router.get('/:id/location', booking.getBookingLocation)
router.get('/:id', booking.getBookingStatus)

router.patch(
  '/:id/status',
  [
    body('status').isIn(['EN_ROUTE', 'STARTED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  ],
  validateRequest,
  booking.updateBookingStatus,
)

router.patch(
  '/:id/verify-daily-otp',
  [
    body('type').isIn(['start', 'end']).withMessage('Invalid OTP type'),
    body('otp').isString().isLength({ min: 4, max: 4 }).withMessage('Valid 4-digit OTP is required'),
    body('dayNumber').isInt({ min: 1 }).withMessage('Valid day number is required'),
  ],
  validateRequest,
  booking.verifyDailyOtp,
)

router.patch(
  '/:id/payment-method',
  [
    body('paymentMethod').isIn(['ONLINE', 'CASH']).withMessage('Invalid payment method'),
  ],
  validateRequest,
  booking.updatePaymentMethod,
)

export default router
