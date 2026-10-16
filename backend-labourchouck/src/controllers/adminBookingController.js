import crypto from 'crypto'
import { Booking } from '../models/Booking.js'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'

export const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
  const skip = (page - 1) * limit

  // Bookings no mechanic ever took: failed/expired searches, still-searching ones, and cancellations
  // that happened before anybody accepted.
  const NOT_ACCEPTED = {
    $or: [{ laborId: null }, { laborId: { $exists: false } }],
    status: { $in: ['FAILED', 'CANCELLED', 'BROADCASTING', 'CREATED'] },
  }

  const query = {}

  if (status === 'NOT_ACCEPTED') {
    Object.assign(query, NOT_ACCEPTED)
  } else if (status && status !== 'ALL') {
    query.status = status
  }

  // Populate users beforehand if search exists, though typical simple search just matches IDs
  // To keep it simple, we'll just filter by status for now.

  const [total, notAccepted] = await Promise.all([
    Booking.countDocuments(query),
    Booking.countDocuments(NOT_ACCEPTED),
  ])
  const bookings = await Booking.find(query)
    .populate('userId', 'fullName phone email profileImageUrl')
    .populate('laborId', 'fullName phone email profileImageUrl')
    .populate('subcategoryId', 'name')
    .populate('serviceId', 'name basePrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean()

  return sendSuccess(res, {
    data: {
      bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      },
      counts: { notAccepted },
    }
  })
})

export const getBookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'fullName phone email profileImageUrl')
    .populate('laborId', 'fullName phone email profileImageUrl')
    .populate('subcategoryId', 'name')
    .populate('serviceId', 'name basePrice')
    .lean()

  if (!booking) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  return sendSuccess(res, { data: { booking } })
})

export const updateBookingStatusAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const validStatuses = [
    'DRAFT', 'CREATED', 'BROADCASTING', 'ACCEPTED', 
    'ASSIGNED', 'EN_ROUTE', 'STARTED', 'COMPLETED', 
    'CANCELLED', 'REFUNDED', 'FAILED'
  ]

  if (!validStatuses.includes(status)) {
    return sendError(res, { message: 'Invalid status', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const booking = await Booking.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate('userId', 'fullName phone email')
   .populate('laborId', 'fullName phone email')

  if (!booking) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  
  // Optionally notify user here if socket is imported

  return sendSuccess(res, { message: 'Booking status updated successfully', data: { booking } })
})

export const assignLabourerManually = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { laborId } = req.body

  if (!laborId) {
    return sendError(res, { message: 'Mechanic ID is required', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const labourer = await User.findById(laborId)
  if (!labourer || labourer.role !== 'mechanic') {
    return sendError(res, { message: 'Valid mechanic is required', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const booking = await Booking.findById(id)
  if (!booking) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(booking.status)) {
    return sendError(res, { message: 'Cannot assign mechanic to a completed or cancelled booking', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  booking.laborId = laborId
  booking.acceptedLabourId = laborId
  booking.status = 'ASSIGNED'
  await booking.save()

  const updatedBooking = await Booking.findById(id)
    .populate('userId', 'fullName phone email profileImageUrl')
    .populate('laborId', 'fullName phone email profileImageUrl')
    .populate('subcategoryId', 'name')
    .populate('serviceId', 'name basePrice')
    .lean()

  return sendSuccess(res, { message: 'Mechanic assigned manually successfully', data: { booking: updatedBooking } })
})

export const createBookingAdmin = asyncHandler(async (req, res) => {
  const bookingData = req.body
  
  // Add some minimum validations based on what your Booking model expects
  if (!bookingData.userId || !bookingData.serviceId || !bookingData.type) {
    return sendError(res, { message: 'userId, serviceId, and type are required', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const startOtp = String(crypto.randomInt(1000, 10000))
  const completionOtp = String(crypto.randomInt(1000, 10000))

  const booking = await Booking.create({
    ...bookingData,
    startOtp,
    completionOtp
  })
  
  return sendSuccess(res, { message: 'Booking created successfully', statusCode: HTTP_STATUS.CREATED, data: { booking } })
})

export const updateBookingAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = req.body

  const booking = await Booking.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    .populate('userId', 'fullName phone email')
    .populate('laborId', 'fullName phone email')
    .populate('subcategoryId', 'name')
    .populate('serviceId', 'name basePrice')

  if (!booking) {
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  return sendSuccess(res, { message: 'Booking updated successfully', data: { booking } })
})

export const deleteBookingAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  
  console.log(`[deleteBookingAdmin] Attempting to delete booking with ID: ${id}`);

  const booking = await Booking.findByIdAndDelete(id)

  if (!booking) {
    console.log(`[deleteBookingAdmin] Booking NOT FOUND for ID: ${id}`);
    return sendError(res, { message: 'Booking not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  console.log(`[deleteBookingAdmin] Successfully deleted booking: ${booking._id}, Status was: ${booking.status}`);
  return sendSuccess(res, { message: 'Booking deleted successfully' })
})
