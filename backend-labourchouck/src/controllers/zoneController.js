import { SystemSetting } from '../models/SystemSetting.js'
import { Booking } from '../models/Booking.js'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'

export const getZoneSettings = asyncHandler(async (req, res) => {
  let settings = await SystemSetting.findOne({ configKey: 'master_config' })
  if (!settings) {
    settings = await SystemSetting.create({ configKey: 'master_config' })
  }
  return sendSuccess(res, { 
    data: { 
      bookingBroadcastRadius: settings.bookingBroadcastRadius
    } 
  })
})

export const updateZoneSettings = asyncHandler(async (req, res) => {
  const { bookingBroadcastRadius } = req.body

  if (bookingBroadcastRadius !== undefined && (typeof bookingBroadcastRadius !== 'number' || bookingBroadcastRadius < 1)) {
    return sendError(res, { message: 'Invalid booking radius', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  
  let settings = await SystemSetting.findOne({ configKey: 'master_config' })
  if (!settings) {
    settings = new SystemSetting({ configKey: 'master_config' })
  }

  if (bookingBroadcastRadius !== undefined) settings.bookingBroadcastRadius = bookingBroadcastRadius

  settings.updatedBy = req.user._id
  await settings.save()

  return sendSuccess(res, { 
    message: 'Radius updated successfully', 
    data: { 
      bookingBroadcastRadius: settings.bookingBroadcastRadius
    } 
  })
})

export const getZoneStatistics = asyncHandler(async (req, res) => {
  // Aggregate stats from Bookings
  const stats = await Booking.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalEligibleLabourers: { $sum: '$eligibleLabourCount' },
        bookingsWithNoLabourers: {
          $sum: { $cond: [{ $eq: ['$eligibleLabourCount', 0] }, 1, 0] }
        },
        avgRadius: { $avg: '$broadcastRadius' }
      }
    }
  ])

  // Count active labourers in the system
  const activeLabourCount = await User.countDocuments({
    role: 'mechanic',
    isActive: true,
    'labourProfile.availabilityStatus': 'available'
  })

  const result = stats[0] || {
    totalBookings: 0,
    totalEligibleLabourers: 0,
    bookingsWithNoLabourers: 0,
    avgRadius: 0
  }

  const broadcastSuccessRate = result.totalBookings > 0 
    ? ((result.totalBookings - result.bookingsWithNoLabourers) / result.totalBookings) * 100 
    : 0

  return sendSuccess(res, {
    data: {
      totalBookings: result.totalBookings,
      totalEligibleLabourers: result.totalEligibleLabourers,
      bookingsWithNoLabourers: result.bookingsWithNoLabourers,
      avgRadius: result.avgRadius ? Math.round(result.avgRadius * 100) / 100 : 0,
      broadcastSuccessRate: Math.round(broadcastSuccessRate * 100) / 100,
      activeLabourCount
    }
  })
})

export const updateLabourLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body

  if (
    typeof latitude !== 'number' || typeof longitude !== 'number' ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180
  ) {
    return sendError(res, { message: 'Invalid coordinates', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  // Targeted update: a location ping must not rewrite (and re-validate) the whole user document.
  const result = await User.updateOne(
    { _id: req.user._id, role: 'mechanic' },
    {
      $set: {
        'labourProfile.currentLatitude': latitude,
        'labourProfile.currentLongitude': longitude,
        'labourProfile.lastLocationUpdatedAt': new Date(),
      },
    },
  )
  if (!result.matchedCount) {
    return sendError(res, { message: 'Unauthorized', statusCode: HTTP_STATUS.FORBIDDEN })
  }

  return sendSuccess(res, { message: 'Location updated successfully' })
})

export const updateLabourStatus = asyncHandler(async (req, res) => {
  const { availabilityStatus } = req.body

  if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
    return sendError(res, { message: 'Invalid status. Must be available, busy, or offline', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const user = await User.findById(req.user._id)
  if (!user || user.role !== 'mechanic') {
    return sendError(res, { message: 'Unauthorized', statusCode: HTTP_STATUS.FORBIDDEN })
  }

  if (!user.labourProfile) {
    user.labourProfile = {}
  }

  user.labourProfile.availabilityStatus = availabilityStatus
  await user.save()

  return sendSuccess(res, { message: `Status updated to ${availabilityStatus}` })
})
