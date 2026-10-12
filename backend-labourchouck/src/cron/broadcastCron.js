import cron from 'node-cron'
import { Booking } from '../models/Booking.js'
import { startBroadcastCycle } from '../services/broadcastService.js'
import { emitToUser } from '../socket.js'
import { sendToUser } from '../services/notificationService.js'
import { refundBookingWalletDiscount } from '../services/bookingSettlementService.js'

export function initBroadcastCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      // Clean up stuck BROADCASTING bookings
      // If a booking has been BROADCASTING for more than 10 minutes, mark as FAILED
      const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000)
      const stuckBookings = await Booking.find(
        { status: 'BROADCASTING', updatedAt: { $lt: tenMinsAgo } }
      ).select('_id userId walletDiscount walletRefundedAt').lean()
      if (stuckBookings.length > 0) {
        // Tell each customer instead of leaving their app on "searching" forever
        for (const stuck of stuckBookings) {
          // Atomic per booking: skip it if a mechanic accepted it in the meantime.
          const failed = await Booking.findOneAndUpdate(
            { _id: stuck._id, status: 'BROADCASTING' },
            { $set: { status: 'FAILED' } },
            { new: true },
          )
          if (!failed) continue
          await refundBookingWalletDiscount(failed, 'expired')
          emitToUser(stuck.userId, 'BOOKING_FAILED', { bookingId: stuck._id, reason: 'Expired' })
          sendToUser(stuck.userId, {
            title: 'No mechanic found',
            body: 'Sorry, we could not find a mechanic for your booking in time. Please try again.',
            type: 'BOOKING_FAILED',
            data: { bookingId: String(stuck._id), reason: 'Expired', link: '/app/my-bookings' },
          }).catch(err => console.error('[CRON] Push notify (stuck booking) failed:', err))
        }
      }

      // 1 hour from now
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
      
      // Find all scheduled bookings that are in CREATED status
      // where the scheduledAt is <= exactly 1 hour from now, but > now
      // This means the job is supposed to start in 1 hour or less.
      const bookingsToBroadcast = await Booking.find({
        type: 'SCHEDULED',
        status: 'CREATED',
        scheduledAt: { 
          $lte: oneHourFromNow,
          $gt: now // Ensure we don't pick up severely outdated ones if they exist
        }
      })

      if (bookingsToBroadcast.length > 0) {
        console.log(`[CRON] Found ${bookingsToBroadcast.length} scheduled bookings to broadcast.`)
      }

      for (const booking of bookingsToBroadcast) {
        console.log(`[CRON] Broadcasting scheduled booking ${booking._id} scheduled for ${booking.scheduledAt}`)
        // The broadcast service will change status to BROADCASTING internally
        await startBroadcastCycle(booking._id).catch(err => {
          console.error(`[CRON] Failed to broadcast booking ${booking._id}:`, err)
        })
      }

    } catch (err) {
      console.error('[CRON] Error running scheduled broadcast cron:', err)
    }
  })

  console.log('Scheduled Broadcast Cron initialized.')
}
