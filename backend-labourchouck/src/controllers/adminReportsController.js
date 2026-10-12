import { Booking } from '../models/Booking.js'
import { User } from '../models/User.js'
import { Complaint } from '../models/Complaint.js'
import { USER_ROLES } from '../constants/roles.js'
import { UserSubscription } from '../models/UserSubscription.js'
import { SystemSetting } from '../models/SystemSetting.js'

export const getDashboardStats = async (req, res) => {
  try {
    // 1. User Stats
    const totalCustomers = await User.countDocuments({ role: USER_ROLES.INDIVIDUAL })
    const totalLabour = await User.countDocuments({ role: USER_ROLES.MECHANIC })
    const totalUsers = totalCustomers + totalLabour

    // 2. Booking Stats
    const totalBookings = await Booking.countDocuments()
    const pendingBookings = await Booking.countDocuments({ status: 'PENDING' })
    const acceptedBookings = await Booking.countDocuments({ status: 'ACCEPTED' })
    const completedBookings = await Booking.countDocuments({ status: 'COMPLETED' })
    const cancelledBookings = await Booking.countDocuments({ status: 'CANCELLED' })

    // 3. Complaint Stats
    const totalComplaints = await Complaint.countDocuments()
    const openComplaints = await Complaint.countDocuments({ status: 'OPEN' })

    // 4. Financial Stats — each source exactly mirrors its frontend admin page
    const systemSettings = await SystemSetting.findOne({ configKey: 'master_config' }).lean()

    // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
    // Include active + expired (customer paid, just plan expired) – NOT cancelled
    // User Subscriptions: individual planType
    const userSubsRaw = await UserSubscription.find({
      status: { $in: ['active', 'expired'] }
    }).populate('plan', 'name price planType').lean()

    let b2cSubRev = 0
    userSubsRaw.forEach(sub => {
      // Use snapshot price if available (price at time of purchase), fallback to plan price
      const price = sub.snapshotPlanDetails?.price ?? sub.plan?.price ?? 0
      b2cSubRev += price
    })

    // ─── BOOKINGS (Individual customers — paymentStatus PAID) ─────────────
    // Base price = booking base price (excludes platformFee, commission, GST stored separately)
    const b2cBookings = await Booking.find({ paymentStatus: 'PAID' }).lean()
    let b2cBaseTotal = 0
    let b2cPlatformFeeTotal = 0
    let b2cCommissionTotal = 0
    let b2cGstTotal = 0

    b2cBookings.forEach(b => {
      b2cBaseTotal += (b.basePrice || 0)

      // Platform fee — dynamic (mirrors AdminPlatformFeePage.jsx logic)
      let pFee = b.platformFee || 0
      if (systemSettings?.platformFee?.isActive) {
        pFee = systemSettings.platformFee.type === 'fixed'
          ? Number(systemSettings.platformFee.value) || 0
          : ((b.basePrice || 0) * (Number(systemSettings.platformFee.value) || 0)) / 100
      }
      b2cPlatformFeeTotal += Math.round(pFee)

      // Commission — dynamic (mirrors AdminCommissionFeePage.jsx logic)
      let cFee = 0
      if (systemSettings?.commission?.isActive !== false) {
        const pct = Number(systemSettings?.commission?.globalPercentage || 10)
        cFee = ((b.basePrice || b.totalAmount || 0) * pct) / 100
      }
      b2cCommissionTotal += Math.round(cFee)

      b2cGstTotal += (b.taxes || 0)
    })

    // ─── TOTALS ───────────────────────────────────────────────────────────────
    const totalPlatformFee = b2cPlatformFeeTotal
    const totalCommissionFee = b2cCommissionTotal
    const totalGst = b2cGstTotal
    const totalBasePrice = b2cBaseTotal

    // Grand Total = all subscription revenue + all booking base prices + platform fees + commission fees + GST
    const grandTotal = b2cSubRev + totalBasePrice + totalPlatformFee + totalCommissionFee + totalGst

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          customer: totalCustomers,
          labour: totalLabour,
          mechanic: totalLabour
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          accepted: acceptedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings
        },
        complaints: {
          total: totalComplaints,
          open: openComplaints
        },
        finance: {
          totalRevenue: grandTotal,
          breakdown: {
            // Subscriptions
            b2cSubRev,
            // Booking base prices (excludes fees/taxes)
            b2cBaseTotal,
            // Fees & taxes
            platformFeeTotal: totalPlatformFee,
            commissionFeeTotal: totalCommissionFee,
            gstTotal: totalGst
          }
        }
      }
    })
  } catch (error) {
    console.error('Error in getDashboardStats:', error)
    res.status(500).json({ success: false, message: 'Server Error while fetching stats' })
  }
}

