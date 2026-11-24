import { Router } from 'express'
import { protect, restrictTo } from '../middleware/auth.js'
import { USER_ROLES } from '../constants/roles.js'
import * as pw from '../controllers/productWalletController.js'

const router = Router()

// Product Wallet belongs to mechanics (sellers) only.
router.use(protect, restrictTo(USER_ROLES.MECHANIC))

router.get('/me', pw.getMyProductWallet)
router.get('/transactions', pw.getMyProductTransactions)
router.get('/withdrawals', pw.getMyProductWithdrawals)
router.post('/withdrawals', pw.requestProductWithdrawal)

export default router
