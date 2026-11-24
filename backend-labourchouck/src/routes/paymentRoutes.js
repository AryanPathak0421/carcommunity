import { Router } from 'express'
import { body } from 'express-validator'
import { protect } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import * as payment from '../controllers/paymentController.js'

const router = Router()

router.use(protect)

router.post(
  '/init',
  [
    // amount is server-decided for BOOKING/ACCESSORY; only WALLET_CLEARANCE may send one.
    body('amount').optional().isNumeric().withMessage('Invalid amount'),
    body('purpose').isIn(['BOOKING', 'WALLET_CLEARANCE', 'ACCESSORY']).withMessage('Invalid purpose'),
    body('bookingId').optional().isMongoId(),
    body('accessoryInquiryId').optional().isMongoId(),
  ],
  validateRequest,
  payment.initPayment,
)

router.post(
  '/verify',
  [
    body('razorpayOrderId').notEmpty().withMessage('razorpayOrderId is required'),
    body('razorpayPaymentId').optional(), // Option in mock mode
    body('razorpaySignature').optional(), // Option in mock mode
  ],
  validateRequest,
  payment.verifyPayment,
)

export default router
