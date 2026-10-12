import { PaymentTransaction } from '../models/PaymentTransaction.js'
import { Booking } from '../models/Booking.js'
import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { createOrder, verifyPaymentSignature } from '../services/paymentService.js'
import { settleBookingIfReady } from '../services/bookingSettlementService.js'
import { sendToUser } from '../services/notificationService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'

const NOT_PAYABLE_STATUSES = ['CANCELLED', 'FAILED', 'REFUNDED', 'DRAFT']

/** Round to paise so Razorpay never sees a float like 99.99999. */
const roundRupees = (n) => Math.round(Number(n) * 100) / 100

export const initPayment = asyncHandler(async (req, res) => {
  const { amount, purpose, bookingId } = req.body

  if (purpose === 'BOOKING' && !bookingId) {
    return sendError(res, { message: 'bookingId is required for BOOKING purpose', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  /**
   * The server always decides what is owed; the client-sent amount is never trusted
   * for a booking, and for a dues clearance it can only ever be lowered.
   */
  let chargeAmount
  if (purpose === 'BOOKING') {
    const booking = await Booking.findOne({ _id: bookingId, userId: req.user._id })
    if (!booking) {
      return sendError(res, {
        message: 'Booking not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: 'BOOKING_NOT_FOUND',
      })
    }
    if (NOT_PAYABLE_STATUSES.includes(booking.status)) {
      return sendError(res, {
        message: `This booking is ${booking.status.toLowerCase()} and cannot be paid`,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'BOOKING_NOT_PAYABLE',
      })
    }
    if (booking.paymentStatus === 'PAID') {
      return sendError(res, {
        message: 'This booking is already paid',
        statusCode: HTTP_STATUS.CONFLICT,
        code: 'ALREADY_PAID',
      })
    }
    if (booking.paymentMethod !== 'ONLINE') {
      return sendError(res, {
        message: 'This booking is set to cash payment',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'NOT_ONLINE_BOOKING',
      })
    }
    chargeAmount =
      booking.payableAmount != null && booking.payableAmount >= 0
        ? booking.payableAmount
        : booking.totalAmount
    if (chargeAmount <= 0) {
      return sendError(res, {
        message: 'This booking is already fully covered by your wallet balance',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'NOTHING_TO_PAY',
      })
    }
  } else if (purpose === 'WALLET_CLEARANCE') {
    const wallet = await Wallet.findOne({ userId: req.user._id }).select('adminBalance').lean()
    const owed = Number(wallet?.adminBalance) || 0
    if (owed <= 0) {
      return sendError(res, {
        message: 'You have no dues to clear',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'NO_DUES',
      })
    }
    const requested = Number(amount)
    chargeAmount = Number.isFinite(requested) && requested > 0 ? Math.min(requested, owed) : owed
  } else {
    return sendError(res, { message: 'Invalid payment purpose', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  chargeAmount = roundRupees(chargeAmount)

  // Generate Razorpay Order
  const receiptId = `rcpt_${req.user._id.toString().slice(-6)}_${Date.now()}`
  let order
  try {
    order = await createOrder(chargeAmount, 'INR', receiptId)
  } catch (err) {
    return sendError(res, {
      message: err.statusCode === 503 ? 'Online payments are currently unavailable' : 'Could not start the payment',
      statusCode: err.statusCode || HTTP_STATUS.SERVER_ERROR,
      code: 'PAYMENT_INIT_FAILED',
    })
  }

  // Record Transaction intent
  const pTx = await PaymentTransaction.create({
    userId: req.user._id,
    bookingId: purpose === 'BOOKING' ? bookingId : undefined,
    razorpayOrderId: order.id,
    amount: chargeAmount,
    purpose,
    status: 'CREATED',
  })

  return sendSuccess(res, { data: { order, paymentTransactionId: pTx._id } })
})

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

  // Only the user who started the payment may verify it.
  const pTx = await PaymentTransaction.findOne({ razorpayOrderId, userId: req.user._id })
  if (!pTx) {
    return sendError(res, { message: 'Payment transaction not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  // Replaying a verified payment must never run the side-effects again.
  if (pTx.status === 'CAPTURED' || pTx.status === 'REFUNDED') {
    return sendSuccess(res, { message: 'Payment already verified', data: { pTx } })
  }

  const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)

  if (!isValid) {
    await PaymentTransaction.updateOne({ _id: pTx._id, status: 'CREATED' }, { $set: { status: 'FAILED' } })

    sendToUser(req.user._id, {
      title: 'Payment failed',
      body: `Your payment of ₹${pTx.amount} could not be verified. If money was deducted it will be refunded automatically.`,
      type: 'PAYMENT_FAILED',
      data: { paymentTransactionId: String(pTx._id) },
    }).catch(err => console.error('Push notify (payment failed) failed:', err))

    return sendError(res, { message: 'Payment verification failed', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  // Exactly one request wins the CREATED/FAILED -> CAPTURED transition.
  const claimed = await PaymentTransaction.findOneAndUpdate(
    { _id: pTx._id, status: { $in: ['CREATED', 'FAILED'] } },
    { $set: { status: 'CAPTURED', razorpayPaymentId, razorpaySignature } },
    { new: true },
  )
  if (!claimed) {
    const current = await PaymentTransaction.findById(pTx._id)
    return sendSuccess(res, { message: 'Payment already verified', data: { pTx: current } })
  }

  // Handle side-effects based on purpose (each runs once, guarded by the claim above)
  if (claimed.purpose === 'BOOKING' && claimed.bookingId) {
    const booking = await Booking.findOneAndUpdate(
      { _id: claimed.bookingId, userId: claimed.userId, paymentStatus: { $ne: 'PAID' } },
      { $set: { paymentStatus: 'PAID' } },
      { new: true },
    )

    if (booking) {
      // Completed job that was waiting for the customer's payment: pay the mechanic now (once).
      if (booking.status === 'COMPLETED') {
        const settled = await settleBookingIfReady(booking._id)
        if (settled && booking.laborId) {
          import('../socket.js').then(({ emitToUser }) => {
            emitToUser(booking.laborId, 'ONLINE_PAYMENT_COMPLETED', { bookingId: booking._id })
          }).catch((err) => console.error(err))

          sendToUser(booking.laborId, {
            title: 'Payment received 💰',
            body: `₹${booking.laborShare} has been credited to your wallet for the completed job.`,
            type: 'WALLET_CREDITED',
            data: { bookingId: String(booking._id), amount: booking.laborShare, link: '/app/wallet' },
          }).catch(err => console.error('Push notify (payout) failed:', err))
        }
      }

      sendToUser(booking.userId, {
        title: 'Payment successful',
        body: `Your payment of ₹${claimed.amount} for the booking was successful.`,
        type: 'PAYMENT_SUCCESS',
        data: { bookingId: String(booking._id), link: '/app/my-bookings' },
      }).catch(err => console.error('Push notify (payment success) failed:', err))
    }
  } else if (claimed.purpose === 'WALLET_CLEARANCE') {
    // Never take the balance below zero and never clear more than was paid.
    const wallet = await Wallet.findOneAndUpdate(
      { userId: claimed.userId },
      [{ $set: { adminBalance: { $max: [0, { $subtract: ['$adminBalance', claimed.amount] }] } } }],
      { new: true },
    )
    if (wallet) {
      await WalletTransaction.create({
        walletId: wallet._id,
        amount: claimed.amount,
        type: 'DEBIT',
        targetWallet: 'ADMIN',
        context: 'CLEARANCE',
        referenceId: claimed._id,
        description: 'Online Payment Clearance',
      })
    }
  }

  return sendSuccess(res, { message: 'Payment verified successfully', data: { pTx: claimed } })
})
