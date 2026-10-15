import crypto from 'crypto'
import { getActivePaymentMethodIds } from '../services/serviceUiConfigService.js'
import { Booking } from '../models/Booking.js'
import { Review } from '../models/Review.js'
import { LabourSubcategory } from '../models/LabourSubcategory.js'
import { LabourService } from '../models/LabourService.js'
import { SystemSetting } from '../models/SystemSetting.js'
import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { parseISTDateTime } from '../utils/dateHelper.js'
import { sendToUser } from '../services/notificationService.js'
import { qualifyReferralForBooking } from '../services/referralService.js'
import { creditSelfBalance, debitSelfBalance, getSelfBalance } from '../services/walletService.js'
import {
  refundBookingWalletDiscount,
  settleBookingIfReady,
  topUpWorkerForCashDiscount,
} from '../services/bookingSettlementService.js'

/** 4-digit OTP from a CSPRNG. */
const newOtp = () => String(crypto.randomInt(1000, 10000))

const DURATION_KINDS = ['few_hours', 'full_day', 'multi_day']
const MAX_DURATION_DAYS = 30

export const calculateBill = asyncHandler(async (req, res) => {
  const { serviceId } = req.body
  const durationDays = Number.parseInt(req.body.durationDays ?? 1, 10)
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_DURATION_DAYS) {
    return sendError(res, { message: `durationDays must be between 1 and ${MAX_DURATION_DAYS}`, statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const service = await LabourService.findById(serviceId)
  let basePrice = 0
  
  if (service) {
    basePrice = service.basePrice * durationDays
  } else {
    const { LabourCategory } = await import('../models/LabourCategory.js')
    const category = await LabourCategory.findById(serviceId)
    if (category) {
      basePrice = 800 * durationDays
    } else {
      return sendError(res, { message: 'Service or Category not found', statusCode: HTTP_STATUS.NOT_FOUND })
    }
  }

  let settings = await SystemSetting.findOne({ configKey: 'master_config' })
  if (!settings) {
    settings = await SystemSetting.create({ configKey: 'master_config' })
  }


  let platformFee = 0

  if (settings.platformFee.isActive) {
    if (settings.platformFee.type === 'fixed') {
      platformFee = settings.platformFee.value
    } else if (settings.platformFee.type === 'percentage') {
      platformFee = (basePrice * settings.platformFee.value) / 100
    }
  }

  const baseAmount = basePrice + platformFee
  let taxes = 0

  if (settings.gstPercentage > 0) {
    taxes = (baseAmount * settings.gstPercentage) / 100
  }

  const totalAmount = baseAmount + taxes

  // Also pre-calculate commission to show to admin internally, but user doesn't necessarily need to see it
  let commissionAmount = 0
  if (settings.commission.isActive && settings.commission.type === 'global') {
    commissionAmount = (basePrice * settings.commission.globalPercentage) / 100
  }

  // Wallet credit the customer could spend on this booking.
  const walletBalance = await getSelfBalance(req.user._id)
  const maxWalletDiscount = Math.min(walletBalance, totalAmount)

  return sendSuccess(res, {
    data: {
      basePrice,
      platformFee,
      taxes,
      totalAmount,
      commissionAmount, // Internal calculation preview
      laborShare: basePrice - commissionAmount,
      walletBalance,
      maxWalletDiscount,
      payableAfterWallet: totalAmount - maxWalletDiscount,
    }
  })
})

export const createBooking = asyncHandler(async (req, res) => {
  const { serviceId, type, scheduledAt, timeSlot, endTime, locationText, lat, lng, paymentMethod, notes, durationKind = 'full_day', imageNames = [], useWallet = false } = req.body
  const durationDays = Number.parseInt(req.body.durationDays ?? 1, 10)

  if (!['CASH', 'ONLINE'].includes(paymentMethod) || !(await getActivePaymentMethodIds()).includes(paymentMethod)) {
    return sendError(res, {
      message: `${paymentMethod === 'ONLINE' ? 'Online' : 'Cash'} payment is not available right now. Please choose another method.`,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'PAYMENT_METHOD_DISABLED',
    })
  }

  if (!DURATION_KINDS.includes(durationKind)) {
    return sendError(res, { message: 'Invalid durationKind', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_DURATION_DAYS) {
    return sendError(res, { message: `durationDays must be between 1 and ${MAX_DURATION_DAYS}`, statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  if (String(locationText).length > 500 || (notes && String(notes).length > 1000) || (Array.isArray(imageNames) && imageNames.length > 10)) {
    return sendError(res, { message: 'Location, notes or images are too long', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  if (!serviceId || !type || !locationText || !paymentMethod) {
    return sendError(res, { message: 'Missing required fields', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  if (lat === undefined || lng === undefined) {
    return sendError(res, { message: 'Latitude and Longitude are required for accurate matching', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const latN = Number(lat)
  const lngN = Number(lng)
  if (!Number.isFinite(latN) || !Number.isFinite(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
    return sendError(res, { message: 'Invalid latitude/longitude', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  if (type === 'SCHEDULED') {
    if (!scheduledAt || !timeSlot) {
      return sendError(res, { message: 'scheduledAt date and timeSlot (startTime) are required for SCHEDULED bookings', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    if (durationKind !== 'multi_day' && !endTime) {
      return sendError(res, { message: 'endTime is required for single day SCHEDULED bookings', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    const when = parseISTDateTime(scheduledAt, timeSlot)
    if (!when || Number.isNaN(new Date(when).getTime()) || new Date(when).getTime() < Date.now()) {
      return sendError(res, {
        message: 'Choose a date and time slot in the future',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'SCHEDULE_IN_PAST',
      })
    }
  }

  const service = await LabourService.findById(serviceId)
  if (!service || !service.isActive) {
    return sendError(res, { message: 'Valid and active Service required', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  let settings = await SystemSetting.findOne({ configKey: 'master_config' })
  
  let activeSub = null
  if (settings?.isUserSubscriptionEnabled) {
    const { UserSubscription } = await import('../models/UserSubscription.js')
    activeSub = await UserSubscription.findOne({ user: req.user._id, status: 'active' }).populate('plan')
    
    if (!activeSub) {
      return sendError(res, { message: 'You must have an active subscription to create a booking.', statusCode: HTTP_STATUS.FORBIDDEN })
    }
    if (activeSub.bookingsUsed >= (activeSub.snapshotPlanDetails?.allowedBookings || 0)) {
      return sendError(res, { message: 'You have reached the maximum number of bookings allowed for your current subscription plan.', statusCode: HTTP_STATUS.FORBIDDEN })
    }
  }

  const basePrice = service.basePrice * (durationKind === 'multi_day' ? durationDays : 1)
  let platformFee = 0
  if (settings?.platformFee?.isActive) {
    platformFee = settings.platformFee.type === 'fixed' 
      ? settings.platformFee.value 
      : (basePrice * settings.platformFee.value) / 100
  }
  
  const baseAmount = basePrice + platformFee
  let taxes = 0
  if (settings?.gstPercentage > 0) {
    taxes = (baseAmount * settings.gstPercentage) / 100
  }
  
  const totalAmount = baseAmount + taxes

  let commissionAmount = 0
  if (settings?.commission?.isActive && settings.commission.type === 'global') {
    commissionAmount = (basePrice * settings.commission.globalPercentage) / 100
  }

  const laborShare = basePrice - commissionAmount

  /**
   * Wallet discount. The debit happens before the booking is written so the
   * balance check and the deduction are one atomic step; if anything below
   * fails we put the money back.
   */
  let walletDiscount = 0
  if (useWallet) {
    const balance = await getSelfBalance(req.user._id)
    const requested = Math.min(balance, totalAmount)
    if (requested > 0) {
      const debit = await debitSelfBalance({
        userId: req.user._id,
        amount: requested,
        context: 'BOOKING',
        description: `Wallet applied to ${service.name || 'booking'}`,
      })
      if (!debit) {
        return sendError(res, {
          message: 'Your wallet balance changed. Please review the bill and try again.',
          statusCode: HTTP_STATUS.CONFLICT,
          code: 'WALLET_BALANCE_CHANGED',
        })
      }
      walletDiscount = requested
    }
  }
  const payableAmount = totalAmount - walletDiscount

  const startOtp = newOtp()
  const completionOtp = newOtp()

  let attendanceLog = []
  const parsedScheduledAt = type === 'SCHEDULED' ? parseISTDateTime(scheduledAt, timeSlot) : undefined;
  if (durationKind === 'multi_day' && parsedScheduledAt) {
    for (let i = 0; i < durationDays; i++) {
      const date = new Date(parsedScheduledAt.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      attendanceLog.push({
        dateStr,
        dayNumber: i + 1,
        startOtp: newOtp(),
        endOtp: newOtp(),
      })
    }
  }

  let booking
  try {
    booking = await Booking.create({
    userId: req.user._id,
    subcategoryId: service.subcategoryId,
    serviceId: service._id,
    type,
    scheduledAt: parsedScheduledAt,
    timeSlot: type === 'SCHEDULED' ? timeSlot : (type === 'INSTANT' ? timeSlot : undefined),
    endTime: type === 'SCHEDULED' ? endTime : undefined,
    images: Array.isArray(imageNames) ? imageNames : [],
    notes,
    durationKind,
    durationDays,
    address: { 
      locationText,
      coordinates: {
        type: 'Point',
        coordinates: [lngN, latN] // GeoJSON uses [longitude, latitude]
      }
    },
    basePrice,
    platformFee,
    taxes,
    totalAmount,
    commissionAmount,
    laborShare,
    walletDiscount,
    payableAmount,
    paymentMethod,
    status: 'CREATED',
    startOtp,
    completionOtp,
    attendanceLog
    })
  } catch (err) {
    // Give the wallet credit back rather than swallowing it with the booking.
    if (walletDiscount > 0) {
      await creditSelfBalance({
        userId: req.user._id,
        amount: walletDiscount,
        context: 'BOOKING',
        description: 'Wallet refund — booking could not be created',
      }).catch((e) => console.error('[wallet] refund after failed booking:', e?.message || e))
    }
    throw err
  }

  if (activeSub) {
    const { UserSubscription } = await import('../models/UserSubscription.js')
    await UserSubscription.findByIdAndUpdate(activeSub._id, { $inc: { bookingsUsed: 1 } })
  }

  // Phase 3: Trigger the Broadcast Engine asynchronously
  // Only trigger immediately for INSTANT bookings.
  // SCHEDULED bookings will be handled by the broadcastCron job 30 mins before the time.
  if (type === 'INSTANT') {
    import('../services/broadcastService.js').then(({ startBroadcastCycle }) => {
      startBroadcastCycle(booking._id).catch(err => console.error('Broadcast Error:', err))
    })
  } else {
    // For scheduled, we can emit a socket event to let the user know it is confirmed and queued
    import('../socket.js').then(({ emitToUser }) => {
      emitToUser(booking.userId, 'BOOKING_SCHEDULED_QUEUED', { bookingId: booking._id, scheduledAt: booking.scheduledAt })
    }).catch(err => console.error(err))

    sendToUser(booking.userId, {
      title: 'Booking scheduled',
      body: 'Your booking is confirmed. We will start finding a mechanic 30 minutes before the scheduled time.',
      type: 'BOOKING_SCHEDULED_QUEUED',
      data: { bookingId: String(booking._id), link: '/app/my-bookings' },
    }).catch(err => console.error('Push notify (scheduled) failed:', err))
  }

  // Save the address for future use if requested
  if (req.body.saveAddress) {
    import('../models/User.js').then(({ User }) => {
      User.findByIdAndUpdate(req.user._id, {
        'savedAddress.text': locationText,
        'savedAddress.lat': lat,
        'savedAddress.lng': lng
      }).catch(err => console.error('Update savedAddress error:', err))
    })
    import('../models/UserAddress.js').then(({ UserAddress }) => {
      UserAddress.updateOne(
        { userId: req.user._id, address: String(locationText).trim() },
        { $setOnInsert: { label: 'Other', lat: lat ?? null, lng: lng ?? null } },
        { upsert: true },
      ).catch(err => console.error('Save UserAddress error:', err))
    })
  }

  return sendSuccess(res, { message: 'Booking created successfully', statusCode: HTTP_STATUS.CREATED, data: { booking } })
})

/** Bookings the signed-in user is allowed to see: their own, the one assigned to them, or admin. */
function bookingAccess(booking, user) {
  const uid = String(user._id)
  const ownerId = String(booking.userId?._id || booking.userId)
  const mechId = booking.laborId ? String(booking.laborId?._id || booking.laborId) : null
  const isOwner = ownerId === uid
  const isAssigned = mechId === uid
  const isAdmin = user.role === 'admin'
  const isOfferedMechanic =
    user.role === 'mechanic' &&
    booking.status === 'BROADCASTING' &&
    (booking.eligibleLabourIds || []).some((m) => String(m) === uid)
  return { isOwner, isAssigned, isAdmin, isOfferedMechanic, allowed: isOwner || isAssigned || isAdmin || isOfferedMechanic }
}

/** OTPs belong to the customer: nobody else ever receives them. */
function stripOtps(booking) {
  delete booking.startOtp
  delete booking.completionOtp
  if (Array.isArray(booking.attendanceLog)) {
    booking.attendanceLog = booking.attendanceLog.map(({ startOtp, endOtp, ...rest }) => rest) // eslint-disable-line no-unused-vars
  }
  delete booking.otpFailCount
  delete booking.otpLockedUntil
  return booking
}

export const getBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('subcategoryId')
    .populate('serviceId')
    .populate('laborId', 'fullName phone profileImageUrl')
    .populate('userId', 'fullName phone')
    .lean()

  // 404 (not 403) so booking ids cannot be probed.
  const access = booking ? bookingAccess(booking, req.user) : { allowed: false }
  if (!booking || !access.allowed) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  if (!access.isOwner) stripOtps(booking)
  // A mechanic merely looking at an offer does not get the customer's phone yet.
  if (access.isOfferedMechanic && !access.isAssigned && booking.userId) delete booking.userId.phone
  delete booking.eligibleLabourIds
  delete booking.rejectedBy

  // Trust signals shown on the live tracking screen (rating, experience) — only once a mechanic is assigned.
  let mechanicStats = null
  const mechId = booking.laborId?._id
  if (mechId && (access.isOwner || access.isAdmin)) {
    const [agg, completedJobs] = await Promise.all([
      Review.aggregate([
        { $match: { revieweeId: mechId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({ laborId: mechId, status: 'COMPLETED' }),
    ])
    mechanicStats = {
      rating: agg[0] ? Math.round(agg[0].avg * 10) / 10 : null,
      ratingCount: agg[0]?.count || 0,
      completedJobs,
    }
  }

  return sendSuccess(res, { data: { booking, mechanicStats } })
})

/** Last known mechanic position, for the customer's map after a refresh / reconnect. */
export const getBookingLocation = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .select('userId laborId status liveLocation eligibleLabourIds')
    .lean()
  const access = booking ? bookingAccess(booking, req.user) : { allowed: false }
  if (!booking || !access.allowed) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  const live = ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(booking.status)
  return sendSuccess(res, {
    data: { bookingId: booking._id, status: booking.status, live, location: live ? booking.liveLocation || null : null },
  })
})

export const getMyBookings = asyncHandler(async (req, res) => {
  const { role, _id } = req.user

  let query = {}
  if (role === 'individual') {
    query = { userId: _id }
  } else if (role === 'mechanic') {
    query = { laborId: _id, status: { $in: ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED', 'COMPLETED', 'CANCELLED'] } }
  } else {
    return sendError(res, { message: 'Unauthorized role for fetching bookings', statusCode: HTTP_STATUS.FORBIDDEN })
  }

  const bookings = await Booking.find(query)
    .populate('subcategoryId')
    .populate('serviceId')
    .populate('userId', 'fullName phone')
    .populate('laborId', 'fullName phone profileImageUrl')
    .sort({ createdAt: -1 })
    .lean()

  if (role === 'mechanic') bookings.forEach(stripOtps)
  bookings.forEach((b) => {
    delete b.eligibleLabourIds
    delete b.rejectedBy
  })

  return sendSuccess(res, { data: { bookings } })
})

// @desc    Update booking payment method
// @route   PATCH /api/v1/bookings/:id/payment-method
// @access  Private (User)
export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body

  if (!(await getActivePaymentMethodIds()).includes(paymentMethod)) {
    return sendError(res, {
      message: 'This payment method is not available right now',
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'PAYMENT_METHOD_DISABLED',
    })
  }

  // Only the owner, and only while nothing has been paid or settled yet.
  const booking = await Booking.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user._id,
      paymentStatus: 'PENDING',
      settledAt: { $exists: false },
      status: { $in: ['DRAFT', 'CREATED', 'BROADCASTING', 'ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'] },
    },
    { $set: { paymentMethod } },
    { new: true },
  )

  if (!booking) {
    const exists = await Booking.exists({ _id: req.params.id, userId: req.user._id })
    return sendError(res, {
      message: exists ? 'Payment method can no longer be changed for this booking' : 'Booking not found',
      statusCode: exists ? HTTP_STATUS.CONFLICT : HTTP_STATUS.NOT_FOUND,
    })
  }

  res.json({ success: true, paymentMethod })
})

const BUSY_CANCEL_STATUSES = ['ACCEPTED', 'ASSIGNED', 'EN_ROUTE']
const OTP_MAX_FAILS = 5
const OTP_LOCK_MS = 15 * 60 * 1000

/**
 * Compare a submitted OTP with the stored one, counting failures per booking and
 * locking the booking for a while after too many wrong tries (4-digit codes are brute-forceable).
 * @returns {Promise<{ ok: true } | { ok: false, statusCode: number, message: string }>}
 */
async function checkBookingOtp(booking, submitted, expected, label) {
  if (booking.otpLockedUntil && booking.otpLockedUntil > new Date()) {
    return { ok: false, statusCode: 429, message: 'Too many wrong OTP attempts. Please wait a few minutes and try again.' }
  }

  const a = Buffer.from(String(submitted ?? '').trim())
  const b = Buffer.from(String(expected ?? '').trim())
  const match = a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b)
  if (match) return { ok: true }

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id },
    { $inc: { otpFailCount: 1 } },
    { new: true },
  ).select('otpFailCount')
  if (updated && updated.otpFailCount >= OTP_MAX_FAILS) {
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { otpFailCount: 0, otpLockedUntil: new Date(Date.now() + OTP_LOCK_MS) } },
    )
    return { ok: false, statusCode: 429, message: 'Too many wrong OTP attempts. Please wait 15 minutes and try again.' }
  }
  return { ok: false, statusCode: HTTP_STATUS.BAD_REQUEST, message: `Invalid ${label} OTP` }
}

/** Everything that must happen exactly once after a job is completed. */
async function runCompletionEffects(booking) {
  await qualifyReferralForBooking(booking)
  await topUpWorkerForCashDiscount(booking)
  // Splits the money; a no-op until the customer has paid when the booking is ONLINE.
  await settleBookingIfReady(booking._id)
}

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, otp, startWorkImage, endWorkImage, beforeImage, afterImage } = req.body
  const booking = await Booking.findById(id)

  if (!booking) return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })

  const uid = String(req.user._id)
  const isMechanic = Boolean(booking.laborId) && String(booking.laborId) === uid
  const isCustomer = String(booking.userId) === uid
  if (!isMechanic && !isCustomer) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  // Who may move the booking where:
  //  - EN_ROUTE / STARTED / COMPLETED: only the assigned mechanic (never the customer).
  //  - CANCELLED: the customer (also while still searching) or the assigned mechanic.
  const mechanicTransitions = {
    ACCEPTED: ['EN_ROUTE'],
    ASSIGNED: ['EN_ROUTE'],
    EN_ROUTE: ['STARTED'],
    STARTED: ['COMPLETED'],
  }
  const cancellableBy = {
    CREATED: { customer: true, mechanic: false },
    BROADCASTING: { customer: true, mechanic: false },
    ACCEPTED: { customer: true, mechanic: true },
    ASSIGNED: { customer: true, mechanic: true },
    EN_ROUTE: { customer: true, mechanic: true },
  }

  if (status === 'CANCELLED') {
    const rule = cancellableBy[booking.status]
    if (!rule) {
      return sendError(res, { message: `A ${booking.status} booking cannot be cancelled`, statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    if ((isCustomer && !rule.customer) || (isMechanic && !rule.mechanic && !isCustomer)) {
      return sendError(res, { message: 'You cannot cancel this booking at this stage', statusCode: HTTP_STATUS.FORBIDDEN })
    }
  } else {
    if (!isMechanic) {
      return sendError(res, { message: 'Only the assigned mechanic can update job progress', statusCode: HTTP_STATUS.FORBIDDEN })
    }
    if (!mechanicTransitions[booking.status]?.includes(status)) {
      return sendError(res, { message: `Invalid transition from ${booking.status} to ${status}`, statusCode: HTTP_STATUS.BAD_REQUEST })
    }
  }

  const set = { status }

  // OTP Verification
  if (status === 'STARTED') {
    if (booking.durationKind === 'multi_day') {
      return sendError(res, { message: 'Please use the daily verification flow for multi-day bookings.', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    if (!otp) return sendError(res, { message: 'OTP is required to start the job', statusCode: HTTP_STATUS.BAD_REQUEST })
    const check = await checkBookingOtp(booking, otp, booking.startOtp, 'Start')
    if (!check.ok) return sendError(res, { message: check.message, statusCode: check.statusCode })
    const finalStartImg = startWorkImage || beforeImage
    if (finalStartImg) set.startWorkImage = finalStartImg
  }

  if (status === 'COMPLETED') {
    if (booking.durationKind === 'multi_day') {
      return sendError(res, { message: 'Please use the daily verification flow for multi-day bookings.', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    if (!otp) return sendError(res, { message: 'OTP is required to complete the job', statusCode: HTTP_STATUS.BAD_REQUEST })
    const check = await checkBookingOtp(booking, otp, booking.completionOtp, 'Completion')
    if (!check.ok) return sendError(res, { message: check.message, statusCode: check.statusCode })
    const finalEndImg = endWorkImage || afterImage
    if (finalEndImg) set.endWorkImage = finalEndImg
  }

  // Compare-and-set on the status we validated against: two concurrent requests cannot both win.
  const updated = await Booking.findOneAndUpdate(
    { _id: id, status: booking.status },
    { $set: { ...set, otpFailCount: 0 }, $unset: { otpLockedUntil: 1 } },
    { new: true },
  )
  if (!updated) {
    return sendError(res, {
      message: 'This booking was just updated. Please refresh and try again.',
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }

  if (status === 'COMPLETED') {
    await runCompletionEffects(updated)
  }

  if (status === 'CANCELLED') {
    await refundBookingWalletDiscount(updated, 'cancelled')

    // A mechanic walking away from an accepted job owes the cancellation penalty (added to dues).
    if (isMechanic && !isCustomer && BUSY_CANCEL_STATUSES.includes(booking.status)) {
      try {
        const settings = await SystemSetting.findOne({ configKey: 'master_config' }).select('cancellationPenalty').lean()
        const penalty = Number(settings?.cancellationPenalty) || 0
        if (penalty > 0) {
          const wallet = await Wallet.findOneAndUpdate(
            { userId: updated.laborId },
            { $inc: { adminBalance: penalty } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          await WalletTransaction.create({
            walletId: wallet._id,
            amount: penalty,
            type: 'CREDIT',
            targetWallet: 'ADMIN',
            context: 'PENALTY',
            referenceId: updated._id,
            description: 'Cancellation penalty',
          })
        }
      } catch (err) {
        console.error('[booking] cancellation penalty failed:', err?.message || err)
      }
    }
  }

  // Notify the other party
  import('../socket.js').then(({ emitToUser }) => {
    emitToUser(updated.userId, 'BOOKING_STATUS_UPDATE', { bookingId: updated._id, status })
    if (status === 'CANCELLED' && updated.laborId && !isMechanic) {
      emitToUser(updated.laborId, 'BOOKING_STATUS_UPDATE', { bookingId: updated._id, status })
    }
  }).catch(err => console.error(err))

  // Push notifications — tell the party who did NOT perform the action
  const actorIsCustomer = isCustomer
  const statusMessages = {
    EN_ROUTE: { title: 'Mechanic on the way', body: 'Your mechanic is on the way to your location.' },
    STARTED: { title: 'Work started', body: 'Your mechanic has started the job.' },
    COMPLETED: { title: 'Job completed', body: 'Your job has been completed. Please rate your experience.' },
    CANCELLED: { title: 'Booking cancelled', body: actorIsCustomer ? 'The customer cancelled the booking.' : 'The mechanic cancelled your booking.' },
  }
  const msg = statusMessages[status]
  if (msg) {
    const recipient = actorIsCustomer ? updated.laborId : updated.userId
    if (recipient) {
      const link = actorIsCustomer ? '/app/jobs' : `/app/tracking/${updated._id}`
      sendToUser(recipient, {
        title: msg.title,
        body: msg.body,
        type: `BOOKING_${status}`,
        data: { bookingId: String(updated._id), status, link },
      }).catch(err => console.error('Push notify (status) failed:', err))
    }
  }

  const out = updated.toObject()
  if (!isCustomer) stripOtps(out)
  return sendSuccess(res, { message: `Booking marked as ${status}`, data: { booking: out } })
})

export const verifyDailyOtp = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { type, otp, dayNumber, image } = req.body
  const booking = await Booking.findById(id)

  if (!booking) return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })

  // Only the assigned mechanic verifies the customer's daily codes.
  if (!booking.laborId || String(booking.laborId) !== String(req.user._id)) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  if (booking.durationKind !== 'multi_day') {
    return sendError(res, { message: 'Daily OTP verification is only for multi-day bookings', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  if (!['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'STARTED'].includes(booking.status)) {
    return sendError(res, { message: `Cannot verify OTP for a ${booking.status} booking`, statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const log = booking.attendanceLog.find((l) => l.dayNumber === dayNumber)
  if (!log) {
    return sendError(res, { message: 'Invalid day number', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const previous = booking.attendanceLog.find((l) => l.dayNumber === dayNumber - 1)

  let notifyPayload = null
  let update
  const filter = {
    _id: booking._id,
    status: booking.status,
    attendanceLog: { $elemMatch: { dayNumber } },
  }

  if (type === 'start') {
    if (log.startOtpVerifiedAt) {
      return sendError(res, { message: `Day ${dayNumber} has already been started`, statusCode: HTTP_STATUS.CONFLICT })
    }
    if (previous && !previous.endOtpVerifiedAt) {
      return sendError(res, { message: `Finish day ${dayNumber - 1} first`, statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    const check = await checkBookingOtp(booking, otp, log.startOtp, 'Start')
    if (!check.ok) return sendError(res, { message: check.message, statusCode: check.statusCode })

    filter.attendanceLog = { $elemMatch: { dayNumber, startOtpVerifiedAt: { $exists: false } } }
    const set = { 'attendanceLog.$.startOtpVerifiedAt': new Date(), otpFailCount: 0 }
    if (dayNumber === 1 && booking.status !== 'STARTED') {
      set.status = 'STARTED'
      if (image) set.startWorkImage = image
      notifyPayload = { title: 'Work started', body: 'Your mechanic has started the job.', type: 'BOOKING_STARTED' }
    } else {
      notifyPayload = {
        title: `Day ${dayNumber} started`,
        body: `Your mechanic has started day ${dayNumber} of the job.`,
        type: 'BOOKING_DAY_STARTED',
      }
    }
    update = { $set: set, $unset: { otpLockedUntil: 1 } }
  } else if (type === 'end') {
    if (!log.startOtpVerifiedAt) {
      return sendError(res, { message: `Start day ${dayNumber} before ending it`, statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    if (log.endOtpVerifiedAt) {
      return sendError(res, { message: `Day ${dayNumber} has already been completed`, statusCode: HTTP_STATUS.CONFLICT })
    }
    const check = await checkBookingOtp(booking, otp, log.endOtp, 'End')
    if (!check.ok) return sendError(res, { message: check.message, statusCode: check.statusCode })

    filter.attendanceLog = { $elemMatch: { dayNumber, endOtpVerifiedAt: { $exists: false } } }
    const set = { 'attendanceLog.$.endOtpVerifiedAt': new Date(), otpFailCount: 0 }
    notifyPayload = {
      title: `Day ${dayNumber} completed`,
      body: `Your mechanic has completed day ${dayNumber}. Work continues tomorrow.`,
      type: 'BOOKING_DAY_COMPLETED',
    }

    // The final day only completes the booking when every earlier day was really finished.
    const isLastDay = dayNumber === booking.durationDays
    const earlierDone = booking.attendanceLog
      .filter((l) => l.dayNumber !== dayNumber)
      .every((l) => l.startOtpVerifiedAt && l.endOtpVerifiedAt)
    if (isLastDay && earlierDone) {
      set.status = 'COMPLETED'
      if (image) set.endWorkImage = image
      notifyPayload = {
        title: 'Job completed',
        body: 'Your job has been completed. Please rate your experience.',
        type: 'BOOKING_COMPLETED',
      }
    }
    update = { $set: set, $unset: { otpLockedUntil: 1 } }
  } else {
    return sendError(res, { message: 'Invalid OTP type', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const updated = await Booking.findOneAndUpdate(filter, update, { new: true })
  if (!updated) {
    return sendError(res, {
      message: 'This booking was just updated. Please refresh and try again.',
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }

  if (updated.status === 'COMPLETED' && booking.status !== 'COMPLETED') {
    await runCompletionEffects(updated)
  }

  import('../socket.js').then(({ emitToUser }) => {
    emitToUser(updated.userId, 'BOOKING_STATUS_UPDATE', { bookingId: updated._id, status: updated.status })
  }).catch(err => console.error(err))

  if (notifyPayload) {
    sendToUser(updated.userId, {
      ...notifyPayload,
      data: { bookingId: String(updated._id), status: updated.status, dayNumber, link: `/app/tracking/${updated._id}` },
    }).catch(err => console.error('Push notify (daily otp) failed:', err))
  }

  const out = updated.toObject()
  stripOtps(out)
  return sendSuccess(res, { message: `Day ${dayNumber} ${type} OTP verified successfully`, data: { booking: out } })
})
