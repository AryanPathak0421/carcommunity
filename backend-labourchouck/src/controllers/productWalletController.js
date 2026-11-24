import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { debitProductBalance, getProductBalance, listProductTransactions } from '../services/walletService.js'
import { notifyAdmins } from '../services/notificationService.js'

const MIN_WITHDRAWAL_AMOUNT = 100
/** Withdrawals still in flight (money has already left the balance as a hold). */
const PENDING_STATUSES = ['PENDING', 'APPROVED', 'PROCESSING']

/**
 * GET /product-wallet/me
 * Mechanic's Product Wallet: available balance + headline totals + recent ledger.
 */
export const getMyProductWallet = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const [wallet, sales, withdrawalAgg, ledger] = await Promise.all([
    Wallet.findOne({ userId }).select('productBalance').lean(),
    WalletTransaction.aggregate([
      { $lookup: { from: 'wallets', localField: 'walletId', foreignField: '_id', as: 'w' } },
      { $unwind: '$w' },
      { $match: { 'w.userId': userId, context: 'PRODUCT_SALE', type: 'CREDIT' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WithdrawalRequest.aggregate([
      { $match: { labourId: userId, walletType: 'PRODUCT' } },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    listProductTransactions(userId, { page: 1, limit: 20 }),
  ])

  let pendingWithdrawal = 0
  let completedWithdrawal = 0
  for (const row of withdrawalAgg) {
    if (PENDING_STATUSES.includes(row._id)) pendingWithdrawal += row.total
    else if (row._id === 'COMPLETED') completedWithdrawal += row.total
  }

  return sendSuccess(res, {
    data: {
      availableBalance: Number(wallet?.productBalance) || 0,
      totalEarned: sales[0]?.total || 0,
      pendingWithdrawal,
      completedWithdrawal,
      minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
      transactions: ledger.transactions,
    },
  })
})

/** GET /product-wallet/transactions?page=&limit= */
export const getMyProductTransactions = asyncHandler(async (req, res) => {
  const data = await listProductTransactions(req.user._id, { page: req.query.page, limit: req.query.limit })
  return sendSuccess(res, { data })
})

/** GET /product-wallet/withdrawals */
export const getMyProductWithdrawals = asyncHandler(async (req, res) => {
  const requests = await WithdrawalRequest.find({ labourId: req.user._id, walletType: 'PRODUCT' })
    .sort({ createdAt: -1 })
    .lean()
  return sendSuccess(res, { data: { requests } })
})

/**
 * POST /product-wallet/withdrawals
 * Hold the amount from the Product Wallet (atomic) and open a PRODUCT withdrawal request.
 */
export const requestProductWithdrawal = asyncHandler(async (req, res) => {
  const { amount, bankDetails } = req.body
  const numAmount = Number(amount)

  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return sendError(res, { message: 'Valid positive amount is required', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  if (numAmount < MIN_WITHDRAWAL_AMOUNT) {
    return sendError(res, {
      message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}`,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'BELOW_MIN_AMOUNT',
    })
  }

  const { accountNumber, ifscCode, accountHolderName, bankName, qrCodeUrl } = bankDetails || {}
  if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
    return sendError(res, { message: 'Incomplete bank details', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  // Hold the money: the balance check is inside the filter, so a mechanic can
  // never withdraw more than they have and two requests cannot both win.
  const wallet = await debitProductBalance({ userId: req.user._id, amount: numAmount })
  if (!wallet) {
    const available = await getProductBalance(req.user._id)
    return sendError(res, {
      message: `Insufficient product wallet balance. You have ₹${available}`,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'INSUFFICIENT_BALANCE',
    })
  }

  let request
  try {
    request = await WithdrawalRequest.create({
      labourId: req.user._id,
      requesterRole: 'mechanic',
      walletType: 'PRODUCT',
      amount: numAmount,
      bankDetails: { accountNumber, ifscCode, accountHolderName, bankName, qrCodeUrl },
      status: 'PENDING',
    })
  } catch (err) {
    // Release the hold rather than stranding the mechanic's money.
    const { creditProductBalance } = await import('../services/walletService.js')
    await creditProductBalance({
      userId: req.user._id,
      amount: numAmount,
      context: 'PRODUCT_WITHDRAWAL',
      description: 'Product withdrawal hold released (request failed)',
    }).catch((e) => console.error('[productWallet] hold rollback failed:', e?.message || e))
    throw err
  }

  notifyAdmins({
    title: 'New product withdrawal request',
    body: `${req.user.fullName || 'A mechanic'} requested a product payout of ₹${numAmount}.`,
    type: 'PRODUCT_WITHDRAWAL_REQUESTED',
    data: { withdrawalId: String(request._id), link: '/admin/product-wallet' },
  }).catch((err) => console.error('Push notify (product withdrawal) failed:', err))

  return sendSuccess(res, {
    message: 'Withdrawal request submitted successfully',
    statusCode: HTTP_STATUS.CREATED,
    data: { request, availableBalance: Number(wallet.productBalance) || 0 },
  })
})
