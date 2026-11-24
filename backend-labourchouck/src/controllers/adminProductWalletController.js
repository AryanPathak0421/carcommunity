import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { creditProductBalance } from '../services/walletService.js'
import { sendToUser } from '../services/notificationService.js'

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED']
/** Which current statuses a target status may be reached from. */
const ALLOWED_FROM = {
  APPROVED: ['PENDING'],
  PROCESSING: ['APPROVED'],
  COMPLETED: ['APPROVED', 'PROCESSING'],
  REJECTED: ['PENDING', 'APPROVED', 'PROCESSING'],
}

/** GET /admin/product-wallet/withdrawals?status= */
export const listProductWithdrawals = asyncHandler(async (req, res) => {
  const query = { walletType: 'PRODUCT' }
  const status = String(req.query.status || '').toUpperCase()
  if (VALID_STATUSES.includes(status)) query.status = status

  const requests = await WithdrawalRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(300)
    .populate('labourId', 'fullName phone')
    .lean()

  // Attach each mechanic's current available product balance.
  const walletByUser = new Map()
  const ids = [...new Set(requests.map((r) => String(r.labourId?._id || r.labourId)).filter(Boolean))]
  if (ids.length) {
    const wallets = await Wallet.find({ userId: { $in: ids } }).select('userId productBalance').lean()
    for (const w of wallets) walletByUser.set(String(w.userId), Number(w.productBalance) || 0)
  }

  const totals = requests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + r.amount
      return acc
    },
    {},
  )

  return sendSuccess(res, {
    data: {
      requests: requests.map((r) => ({
        _id: r._id,
        mechanic: r.labourId ? { _id: r.labourId._id, name: r.labourId.fullName, phone: r.labourId.phone } : null,
        availableBalance: walletByUser.get(String(r.labourId?._id || r.labourId)) ?? 0,
        amount: r.amount,
        status: r.status,
        adminRemarks: r.adminRemarks,
        bankDetails: r.bankDetails,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      totals,
    },
  })
})

/**
 * PATCH /admin/product-wallet/withdrawals/:id
 * Move a request to APPROVED / PROCESSING / COMPLETED / REJECTED.
 * REJECTED returns the held money; COMPLETED writes the payout ledger row.
 */
export const processProductWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.params
  const status = String(req.body.status || '').toUpperCase()
  const adminRemarks = String(req.body.adminRemarks || '').slice(0, 500)

  if (!ALLOWED_FROM[status]) {
    return sendError(res, {
      message: 'Status must be APPROVED, PROCESSING, COMPLETED or REJECTED',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    })
  }

  // Claim the transition atomically: only valid previous states match, so a
  // double click or two admins cannot both move the same request.
  const claimed = await WithdrawalRequest.findOneAndUpdate(
    { _id: id, walletType: 'PRODUCT', status: { $in: ALLOWED_FROM[status] } },
    { $set: { status, adminRemarks, processedAt: new Date(), processedBy: req.user._id } },
    { new: true },
  )
  if (!claimed) {
    const existing = await WithdrawalRequest.findById(id).select('status walletType').lean()
    if (!existing || existing.walletType !== 'PRODUCT') {
      return sendError(res, { message: 'Withdrawal request not found', statusCode: HTTP_STATUS.NOT_FOUND })
    }
    return sendError(res, {
      message: `Cannot move a ${existing.status} request to ${status}`,
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'INVALID_TRANSITION',
    })
  }

  const mechanicId = claimed.labourId
  try {
    if (status === 'REJECTED') {
      // Return the held amount to the Product Wallet (atomic $inc + ledger row).
      await creditProductBalance({
        userId: mechanicId,
        amount: claimed.amount,
        context: 'PRODUCT_WITHDRAWAL',
        referenceId: claimed._id,
        description: `Product withdrawal rejected — amount returned.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      })
    } else if (status === 'COMPLETED') {
      // The amount was already held at request time; record the payout leaving the wallet.
      const wallet = await Wallet.findOne({ userId: mechanicId }).select('_id').lean()
      await WalletTransaction.create({
        walletId: wallet?._id,
        amount: claimed.amount,
        type: 'DEBIT',
        targetWallet: 'BANK',
        context: 'PRODUCT_WITHDRAWAL',
        referenceId: claimed._id,
        description: `Product withdrawal paid to bank.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      })
    }
  } catch (err) {
    console.error('[productWithdrawal] decision recorded but ledger/refund failed for', String(claimed._id), err?.message || err)
  }

  const messages = {
    APPROVED: `Your product withdrawal of ₹${claimed.amount} was approved and is being processed.`,
    PROCESSING: `Your product withdrawal of ₹${claimed.amount} is now processing.`,
    COMPLETED: `Your product withdrawal of ₹${claimed.amount} has been paid to your bank.`,
    REJECTED: `Your product withdrawal of ₹${claimed.amount} was rejected and returned to your wallet.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
  }
  sendToUser(mechanicId, {
    title: `Product withdrawal ${status.toLowerCase()}`,
    body: messages[status],
    type: `PRODUCT_WITHDRAWAL_${status}`,
    data: { withdrawalId: String(claimed._id), link: '/app/product-wallet' },
  }).catch((err) => console.error('Push notify (product withdrawal decision) failed:', err))

  return sendSuccess(res, {
    message: `Withdrawal request ${status.toLowerCase()} successfully`,
    data: { request: claimed },
  })
})
