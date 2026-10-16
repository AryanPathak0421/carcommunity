import { Booking } from '../models/Booking.js'
import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { AdminWallet } from '../models/AdminWallet.js'
import { PaymentTransaction } from '../models/PaymentTransaction.js'
import { creditSelfBalance } from './walletService.js'
import { refundPayment } from './paymentService.js'
import { releaseBookingParts } from './partsService.js'

/**
 * Money that has to move when a booking ends in a particular way.
 *
 * Every helper is idempotent: it claims its job with a conditional update on the
 * booking first, so the many code paths that can end a booking cannot pay twice
 * between them. None of them ever throws into the caller.
 */

/**
 * Give the customer their wallet credit back when a booking will never happen
 * (cancelled, failed, expired). Also refunds an online payment that was already captured.
 * @param {any} booking a Booking document or lean object
 */
export async function refundBookingWalletDiscount(booking, reason = 'cancelled') {
  let refunded = false
  // Every path that ends a booking without a job comes through here, so this is also where the
  // reserved car parts go back on the shelf.
  await releaseBookingParts(booking)
  try {
    const amount = Number(booking?.walletDiscount) || 0
    if (amount > 0 && !booking.walletRefundedAt) {
      const claimed = await Booking.findOneAndUpdate(
        { _id: booking._id, walletRefundedAt: { $exists: false } },
        { $set: { walletRefundedAt: new Date() } },
        { new: true },
      )
      if (claimed) {
        await creditSelfBalance({
          userId: booking.userId,
          amount,
          context: 'BOOKING',
          referenceId: booking._id,
          description: `Wallet refund — booking ${reason}`,
        })
        refunded = true
      }
    }
  } catch (err) {
    console.error('[wallet] booking refund failed:', err?.message || err)
  }

  await refundBookingOnlinePayment(booking, reason)
  return refunded
}

/**
 * Refund the Razorpay payment of a booking that will never be fulfilled.
 * Only when it was paid online and the money was not already split with the mechanic.
 */
export async function refundBookingOnlinePayment(booking, reason = 'cancelled') {
  try {
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        settledAt: { $exists: false },
        onlineRefundedAt: { $exists: false },
      },
      { $set: { onlineRefundedAt: new Date() } },
      { new: true },
    )
    if (!claimed) return false

    const pTx = await PaymentTransaction.findOne({
      bookingId: booking._id,
      purpose: 'BOOKING',
      status: 'CAPTURED',
    }).sort({ createdAt: -1 })

    const result = await refundPayment(pTx?.razorpayPaymentId, pTx?.amount)
    if (!result.ok) {
      // Give the claim back so a later retry (or a manual refund) can still happen.
      await Booking.updateOne({ _id: booking._id }, { $unset: { onlineRefundedAt: 1 } })
      console.error(`[payment] refund failed for booking ${booking._id} (${reason}):`, result.error)
      return false
    }

    await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: 'REFUNDED' } })
    if (pTx) {
      pTx.status = 'REFUNDED'
      await pTx.save()
    }
    return true
  } catch (err) {
    console.error('[payment] online refund error:', err?.message || err)
    return false
  }
}

/**
 * CASH booking with a wallet discount: the customer handed the worker less cash
 * than the job is worth, while the worker still owes the platform the full fees.
 * Top the worker up so the platform absorbs the discount, not the worker.
 * @param {any} booking a Booking document
 */
export async function topUpWorkerForCashDiscount(booking) {
  try {
    const amount = Number(booking?.walletDiscount) || 0
    if (amount <= 0 || booking.paymentMethod !== 'CASH' || booking.walletTopUpAt) return false
    if (!booking.laborId) return false

    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, walletTopUpAt: { $exists: false } },
      { $set: { walletTopUpAt: new Date() } },
      { new: true },
    )
    if (!claimed) return false

    await creditSelfBalance({
      userId: booking.laborId,
      amount,
      context: 'BOOKING',
      referenceId: booking._id,
      description: 'Platform top-up for customer wallet discount',
    })
    return true
  } catch (err) {
    console.error('[wallet] cash top-up failed:', err?.message || err)
    return false
  }
}

async function bumpAdminWallet(booking) {
  await AdminWallet.findOneAndUpdate(
    {},
    {
      $inc: {
        totalPlatformFeesCollected: booking.platformFee || 0,
        totalCommissionsCollected: booking.commissionAmount || 0,
        totalTaxesCollected: booking.taxes || 0,
        totalServiceAmountCollected: booking.basePrice || 0,
      },
    },
    { upsert: true },
  )
}

/**
 * Split the money of a COMPLETED booking, exactly once.
 *
 *  - CASH:   the mechanic holds the cash, so platform fee + tax + commission is added to
 *            what the mechanic owes the platform (adminBalance).
 *  - ONLINE: the platform holds the money, so the mechanic's share is paid into their wallet.
 *            Only once the customer's payment is verified (paymentStatus PAID).
 *
 * Safe to call from every completion / payment path; only the first call that finds the
 * booking ready wins the `settledAt` claim.
 *
 * @param {string|import('mongoose').Types.ObjectId} bookingId
 * @returns {Promise<boolean>} true when this call performed the settlement
 */
export async function settleBookingIfReady(bookingId) {
  try {
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: 'COMPLETED',
        laborId: { $exists: true, $ne: null },
        settledAt: { $exists: false },
        onlineRefundedAt: { $exists: false },
        $or: [{ paymentMethod: 'CASH' }, { paymentMethod: 'ONLINE', paymentStatus: 'PAID' }],
      },
      // a completed cash job is paid once the mechanic has collected it; online is already PAID
      { $set: { settledAt: new Date(), paymentStatus: 'PAID' } },
      { new: true },
    )
    if (!claimed) return false

    if (claimed.paymentMethod === 'CASH') {
      const adminDues = (claimed.platformFee || 0) + (claimed.taxes || 0) + (claimed.commissionAmount || 0)
      if (adminDues > 0) {
        const wallet = await Wallet.findOneAndUpdate(
          { userId: claimed.laborId },
          { $inc: { adminBalance: adminDues } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        await WalletTransaction.create({
          walletId: wallet._id,
          amount: adminDues,
          type: 'CREDIT',
          targetWallet: 'ADMIN',
          context: 'BOOKING',
          referenceId: claimed._id,
          description: 'Platform fees, taxes & commission for Cash Booking',
        })
      }
    } else {
      // The mechanic supplied the parts, so the whole parts amount is theirs on top of their share.
      const share = (Number(claimed.laborShare) || 0) + (Number(claimed.partsTotal) || 0)
      if (share > 0) {
        await creditSelfBalance({
          userId: claimed.laborId,
          amount: share,
          context: 'PAYOUT',
          referenceId: claimed._id,
          description: 'Payout for Online Booking',
        })
      }
    }

    await bumpAdminWallet(claimed)
    return true
  } catch (err) {
    // Deliberately keep the claim: a retry could pay twice. A missing payout is visible and
    // fixable by an admin; a double payout is not.
    console.error('[settlement] NEEDS RECONCILIATION for booking', String(bookingId), err?.message || err)
    return false
  }
}
