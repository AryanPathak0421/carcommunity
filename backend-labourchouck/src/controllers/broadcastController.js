import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { sendToUser } from '../services/notificationService.js'
import { refundBookingWalletDiscount } from '../services/bookingSettlementService.js'

export const acceptBroadcast = asyncHandler(async (req, res) => {
  const { bookingId } = req.params
  const laborId = req.user._id

  if (!mongoose.isValidObjectId(bookingId)) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  // 0. Only KYC-verified mechanics may take jobs
  if (req.user.labourProfile?.kycStatus !== 'verified') {
    return sendError(res, {
      message: 'Complete KYC verification before accepting jobs.',
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'KYC_REQUIRED',
    })
  }

  // 1. Check Cash Limit before allowing acceptance
  const { Wallet } = await import('../models/Wallet.js')
  const { SystemSetting } = await import('../models/SystemSetting.js')

  const wallet = await Wallet.findOne({ userId: laborId })
  if (wallet && wallet.adminBalance > 0) {
    const settings = await SystemSetting.findOne({ configKey: 'master_config' })
    if (settings && wallet.adminBalance >= (settings.labourCashLimit ?? 500)) {
      return sendError(res, {
        message: `Cannot accept new bookings. You owe the admin ₹${wallet.adminBalance}. Please clear your dues first.`,
        statusCode: HTTP_STATUS.FORBIDDEN,
      })
    }
  }

  // 2. Atomic FCFS Update
  // Only a mechanic this offer was broadcast to (eligibleLabourIds) can win it, and only while
  // it is still BROADCASTING. The first update succeeds, later ones find nothing.
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'BROADCASTING', eligibleLabourIds: laborId },
    {
      $set: {
        status: 'ACCEPTED',
        acceptedLabourId: laborId,
        laborId,
      },
    },
    { new: true },
  )

  if (!booking) {
    // Not found / not offered to this mechanic / already taken: answer precisely, without
    // leaking bookings the caller was never offered.
    const currentBooking = await Booking.findById(bookingId).select('status eligibleLabourIds')
    const wasOffered = currentBooking?.eligibleLabourIds?.some((m) => String(m) === String(laborId))
    if (!currentBooking || !wasOffered) {
      return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
    }
    if (currentBooking.status === 'ACCEPTED') {
      return sendError(res, { message: 'Booking was already accepted by another mechanic', statusCode: HTTP_STATUS.CONFLICT })
    }
    if (currentBooking.status === 'CANCELLED') {
      return sendError(res, { message: 'Booking was cancelled by the customer', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    return sendError(res, { message: `Cannot accept booking. Current status is ${currentBooking.status}`, statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  // 3. Notify the customer, and dismiss the offer for the other mechanics who received it
  import('../socket.js').then(({ emitToUser }) => {
    emitToUser(booking.userId, 'BOOKING_ACCEPTED', { bookingId: booking._id, laborId })
    ;(booking.eligibleLabourIds || []).forEach((mid) => {
      if (String(mid) !== String(laborId)) emitToUser(mid, 'BOOKING_EXPIRED', { bookingId: booking._id })
    })
  }).catch(err => console.error('Failed to notify sockets:', err))

  sendToUser(booking.userId, {
    title: 'Mechanic found!',
    body: `${req.user.fullName || 'A mechanic'} accepted your booking and will be on the way soon.`,
    type: 'BOOKING_ACCEPTED',
    data: { bookingId: String(booking._id), link: `/app/tracking/${booking._id}` },
  }).catch(err => console.error('Push notify (accepted) failed:', err))

  const out = booking.toObject()
  delete out.startOtp
  delete out.completionOtp
  delete out.eligibleLabourIds
  delete out.rejectedBy
  out.attendanceLog = (out.attendanceLog || []).map(({ startOtp, endOtp, ...rest }) => rest) // eslint-disable-line no-unused-vars

  return sendSuccess(res, { message: 'Booking accepted successfully', data: { booking: out } })
})

export const rejectBroadcast = asyncHandler(async (req, res) => {
  const { bookingId } = req.params
  const laborId = req.user._id

  if (!mongoose.isValidObjectId(bookingId)) {
    return sendSuccess(res, { message: 'Booking already handled or no longer broadcasting' })
  }

  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'BROADCASTING', eligibleLabourIds: laborId },
    { $addToSet: { rejectedBy: laborId } },
    { new: true },
  )

  if (!booking) {
    return sendSuccess(res, { message: 'Booking already handled or no longer broadcasting' })
  }

  // If everyone eligible has rejected it, fail it immediately to save customer wait time
  if ((booking.rejectedBy?.length || 0) >= (booking.eligibleLabourCount || 0)) {
    // Atomic: loses cleanly if someone accepted in the meantime.
    const failed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'BROADCASTING' },
      { $set: { status: 'FAILED' } },
      { new: true },
    )
    if (failed) {
      await refundBookingWalletDiscount(failed, 'could not be matched')

      import('../socket.js').then(({ emitToUser }) => {
        emitToUser(failed.userId, 'BOOKING_FAILED', { bookingId: failed._id, reason: 'All available mechanics declined' })
        ;(failed.eligibleLabourIds || []).forEach((mid) => emitToUser(mid, 'BOOKING_EXPIRED', { bookingId: failed._id }))
      }).catch(err => console.error('Failed to notify sockets on reject:', err))

      sendToUser(failed.userId, {
        title: 'No mechanic available',
        body: 'All nearby mechanics declined your booking. Please try again in a while.',
        type: 'BOOKING_FAILED',
        data: { bookingId: String(failed._id), reason: 'All declined', link: '/app/my-bookings' },
      }).catch(err => console.error('Push notify (all declined) failed:', err))
    }
  }

  return sendSuccess(res, { message: 'Booking rejected successfully' })
})
