import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'

/**
 * Shared wallet primitives.
 *
 * Balance changes go through `$inc` on a single `findOneAndUpdate`, so two
 * concurrent credits cannot overwrite each other the way a read-modify-write
 * `wallet.selfBalance += x; wallet.save()` can.
 */

/**
 * Fetch the caller's wallet, creating an empty one the first time.
 * @param {import('mongoose').Types.ObjectId | string} userId
 */
export async function getOrCreateWallet(userId) {
  return Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { selfBalance: 0, adminBalance: 0, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

/**
 * Add money to a user's spendable balance and write the matching ledger row.
 *
 * @param {object} options
 * @param {import('mongoose').Types.ObjectId|string} options.userId
 * @param {number} options.amount positive rupees
 * @param {'BOOKING'|'CLEARANCE'|'INCENTIVE'|'PENALTY'|'PAYOUT'|'MANUAL'|'WITHDRAWAL'|'REFERRAL'} options.context
 * @param {import('mongoose').Types.ObjectId|string} [options.referenceId]
 * @param {string} [options.description]
 * @returns {Promise<{ wallet: any, transaction: any }>}
 */
export async function creditSelfBalance({ userId, amount, context, referenceId, description }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('creditSelfBalance requires a positive amount')
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { selfBalance: value } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    amount: value,
    type: 'CREDIT',
    targetWallet: 'SELF',
    context,
    referenceId,
    description,
  })

  return { wallet, transaction }
}

/**
 * Take money out of a user's spendable balance.
 *
 * The balance check lives in the query filter, so the decrement and the check
 * are one atomic operation. Two concurrent spends of the same rupee cannot both
 * succeed: the second one matches no document and gets `null` back.
 *
 * @param {object} options
 * @param {import('mongoose').Types.ObjectId|string} options.userId
 * @param {number} options.amount positive rupees
 * @param {'BOOKING'|'CLEARANCE'|'INCENTIVE'|'PENALTY'|'PAYOUT'|'MANUAL'|'WITHDRAWAL'|'REFERRAL'} options.context
 * @param {import('mongoose').Types.ObjectId|string} [options.referenceId]
 * @param {string} [options.description]
 * @returns {Promise<{ wallet: any, transaction: any } | null>} null when the balance was too low
 */
export async function debitSelfBalance({ userId, amount, context, referenceId, description }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('debitSelfBalance requires a positive amount')
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId, selfBalance: { $gte: value } },
    { $inc: { selfBalance: -value } },
    { new: true },
  )
  if (!wallet) return null

  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    amount: value,
    type: 'DEBIT',
    targetWallet: 'SELF',
    context,
    referenceId,
    description,
  })

  return { wallet, transaction }
}

/** Current spendable balance, 0 when the user has no wallet yet. */
export async function getSelfBalance(userId) {
  const wallet = await Wallet.findOne({ userId }).select('selfBalance').lean()
  return Number(wallet?.selfBalance) || 0
}

// ---------------------------------------------------------------------------
// Product Wallet — mirror of the SELF primitives, on the `productBalance` field.
// Kept separate so product earnings never touch service earnings.
// ---------------------------------------------------------------------------

/** Add money to a mechanic's Product Wallet and write the matching ledger row. */
export async function creditProductBalance({ userId, amount, context = 'PRODUCT_SALE', referenceId, description }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('creditProductBalance requires a positive amount')
  }
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { productBalance: value } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  const transaction = await WalletTransaction.create({
    walletId: wallet._id,
    amount: value,
    type: 'CREDIT',
    targetWallet: 'PRODUCT',
    context,
    referenceId,
    description,
  })
  return { wallet, transaction }
}

/**
 * Atomically hold/spend from the Product Wallet. The balance check is in the
 * filter, so two concurrent withdrawals of the same rupees cannot both succeed.
 * Returns the updated wallet, or null when the balance was too low. No ledger
 * row is written (the withdrawal flow records its own on approval/refund).
 */
export async function debitProductBalance({ userId, amount }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('debitProductBalance requires a positive amount')
  }
  return Wallet.findOneAndUpdate(
    { userId, productBalance: { $gte: value } },
    { $inc: { productBalance: -value } },
    { new: true },
  )
}

/** Current Product Wallet balance, 0 when the user has no wallet yet. */
export async function getProductBalance(userId) {
  const wallet = await Wallet.findOne({ userId }).select('productBalance').lean()
  return Number(wallet?.productBalance) || 0
}

/** Product-wallet ledger rows for a user, newest first. */
export async function listProductTransactions(userId, { page = 1, limit = 20 } = {}) {
  const wallet = await Wallet.findOne({ userId }).select('_id').lean()
  if (!wallet) return { transactions: [], pagination: { total: 0, page: 1, limit, pages: 1 } }
  const filter = { walletId: wallet._id, context: { $in: ['PRODUCT_SALE', 'PRODUCT_WITHDRAWAL', 'PRODUCT_REFUND'] } }
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    WalletTransaction.countDocuments(filter),
  ])
  return { transactions, pagination: { total, page: safePage, limit: safeLimit, pages: Math.max(1, Math.ceil(total / safeLimit)) } }
}

/**
 * Ledger rows for a user, newest first.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {{ page?: number, limit?: number }} [opts]
 */
export async function listWalletTransactions(userId, { page = 1, limit = 20 } = {}) {
  const wallet = await Wallet.findOne({ userId })
  if (!wallet) {
    return { transactions: [], pagination: { total: 0, page: 1, limit, pages: 1 } }
  }

  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    WalletTransaction.countDocuments({ walletId: wallet._id }),
  ])

  return {
    transactions,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  }
}
