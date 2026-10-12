import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { Wallet } from '../models/Wallet.js'
import { WalletTransaction } from '../models/WalletTransaction.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { sendToUser } from '../services/notificationService.js'
import { creditSelfBalance } from '../services/walletService.js'

export const getAllWithdrawalRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  // Mechanic payouts only — customer requests have their own list.
  const query = status
    ? { status, labourId: { $exists: true } }
    : { labourId: { $exists: true } }
  const skip = (Number(page) - 1) * Number(limit)

  const requests = await WithdrawalRequest.find(query)
    .populate('labourId', 'fullName phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean()

  const total = await WithdrawalRequest.countDocuments(query)

  return sendSuccess(res, {
    data: {
      requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    },
  })
})

/**
 * GET /admin/wallets/user-withdrawals — customer payout requests, plus the
 * headline numbers the admin page shows above the table.
 */
export const getAllUserWithdrawalRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const base = { userId: { $exists: true } }
  const query = status ? { ...base, status } : base
  const skip = (Number(page) - 1) * Number(limit)

  const [requests, total, summaryRows] = await Promise.all([
    WithdrawalRequest.find(query)
      .populate('userId', 'fullName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    WithdrawalRequest.countDocuments(query),
    WithdrawalRequest.aggregate([
      { $match: base },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
  ])

  const summary = { pending: 0, pendingAmount: 0, approved: 0, paidOut: 0, rejected: 0 }
  for (const row of summaryRows) {
    if (row._id === 'PENDING') {
      summary.pending = row.count
      summary.pendingAmount = row.amount
    } else if (row._id === 'APPROVED') {
      summary.approved = row.count
      summary.paidOut = row.amount
    } else if (row._id === 'REJECTED') {
      summary.rejected = row.count
    }
  }

  return sendSuccess(res, {
    data: {
      requests,
      summary,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    },
  })
})

export const getCollectedCommissionAmount = asyncHandler(async (req, res) => {
  const { AdminWallet } = await import('../models/AdminWallet.js')
  let adminWallet = await AdminWallet.findOne().lean()

  if (!adminWallet) {
    adminWallet = {
      totalCommissionsCollected: 0,
      totalPlatformFeesCollected: 0,
      totalServiceAmountCollected: 0,
    }
  }

  sendSuccess(res, {
    data: {
      commissionAmount: adminWallet.totalCommissionsCollected,
      platformFeesAmount: adminWallet.totalPlatformFeesCollected,
      serviceAmount: adminWallet.totalServiceAmountCollected,
    },
  })
})

export const processWithdrawalRequest = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, adminRemarks } = req.body

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return sendError(res, { message: 'Status must be APPROVED or REJECTED', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  /**
   * Customer payouts. The hold and its ledger row were written when the request
   * was made, so approving only records the decision and rejecting returns the
   * money. Claiming the row conditionally makes a double click harmless.
   */
  const existing = await WithdrawalRequest.findById(id).select('userId status').lean()
  if (existing?.userId) {
    const claimed = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status,
          adminRemarks: adminRemarks || '',
          processedAt: new Date(),
          processedBy: req.user._id,
        },
      },
      { new: true },
    )
    if (!claimed) {
      return sendError(res, {
        message: 'This request has already been processed',
        statusCode: HTTP_STATUS.CONFLICT,
        code: 'ALREADY_PROCESSED',
      })
    }

    if (status === 'REJECTED') {
      await creditSelfBalance({
        userId: claimed.userId,
        amount: claimed.amount,
        context: 'WITHDRAWAL',
        referenceId: claimed._id,
        description: `Withdrawal rejected — amount returned.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      })
    }

    sendToUser(claimed.userId, {
      title: status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected',
      body:
        status === 'APPROVED'
          ? `Your withdrawal of ₹${claimed.amount} has been approved and will be transferred to your bank.`
          : `Your withdrawal of ₹${claimed.amount} was rejected and returned to your wallet.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      type: `WITHDRAWAL_${status}`,
      data: { withdrawalId: String(claimed._id), link: '/app/wallet' },
    }).catch((err) => console.error('Push notify (customer withdrawal decision) failed:', err))

    return sendSuccess(res, {
      message: `Withdrawal request ${status.toLowerCase()} successfully`,
      data: { request: claimed },
    })
  }

  /**
   * Mechanic payouts. The amount was held (deducted from selfBalance) when the request was made.
   * One conditional update claims the request, so a double click or two admins cannot both decide it;
   * no multi-document transaction is needed (and none is available on a standalone MongoDB).
   */
  const claimed = await WithdrawalRequest.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    {
      $set: {
        status,
        adminRemarks: adminRemarks || '',
        processedAt: new Date(),
        processedBy: req.user._id,
      },
    },
    { new: true },
  )
  if (!claimed) {
    const exists = await WithdrawalRequest.exists({ _id: id })
    return sendError(res, {
      message: exists ? 'This request has already been processed' : 'Withdrawal request not found',
      statusCode: exists ? HTTP_STATUS.CONFLICT : HTTP_STATUS.NOT_FOUND,
      code: exists ? 'ALREADY_PROCESSED' : 'NOT_FOUND',
    })
  }

  const mechanicId = claimed.labourId
  try {
    if (status === 'REJECTED') {
      // Return the held amount (atomic $inc + ledger row)
      await creditSelfBalance({
        userId: mechanicId,
        amount: claimed.amount,
        context: 'WITHDRAWAL',
        referenceId: claimed._id,
        description: `Withdrawal rejected — amount returned.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      })
    } else {
      const wallet = await Wallet.findOne({ userId: mechanicId }).select('_id').lean()
      // The amount is already deducted; only the payout ledger row is written.
      await WalletTransaction.create({
        walletId: wallet?._id,
        amount: claimed.amount,
        type: 'DEBIT',
        targetWallet: 'BANK',
        context: 'WITHDRAWAL',
        referenceId: claimed._id,
        description: `Withdrawal approved to bank. Remarks: ${adminRemarks || 'N/A'}`,
      })
    }
  } catch (err) {
    // Decision is recorded; surface the ledger failure loudly instead of silently double-paying on retry.
    console.error('[withdrawal] decision recorded but ledger/refund failed for', String(claimed._id), err?.message || err)
  }

  sendToUser(mechanicId, {
    title: status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected',
    body: status === 'APPROVED'
      ? `Your withdrawal of ₹${claimed.amount} has been approved and will be transferred to your bank.`
      : `Your withdrawal of ₹${claimed.amount} was rejected and refunded to your wallet.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
    type: `WITHDRAWAL_${status}`,
    data: { withdrawalId: String(claimed._id), link: '/app/wallet' },
  }).catch((err) => console.error('Push notify (withdrawal decision) failed:', err))

  return sendSuccess(res, {
    message: `Withdrawal request ${status.toLowerCase()} successfully`,
    data: { request: claimed },
  })
})
