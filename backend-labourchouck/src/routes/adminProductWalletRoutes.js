import { Router } from 'express'
import { param } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as admin from '../controllers/adminProductWalletController.js'

const router = Router()
router.use(protect, restrictTo(USER_ROLES.ADMIN))

router.get('/withdrawals', admin.listProductWithdrawals)
router.patch(
  '/withdrawals/:id',
  [param('id').isMongoId().withMessage('Invalid id')],
  validateRequest,
  admin.processProductWithdrawal,
)

export default router
