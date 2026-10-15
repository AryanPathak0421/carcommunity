import { Router } from 'express'
import { param } from 'express-validator'
import { optionalAuth, protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as acc from '../controllers/accessoryController.js'

const router = Router()
const idParam = [param('id').isMongoId().withMessage('Invalid product id')]
const customer = restrictTo(USER_ROLES.INDIVIDUAL)
const mechanic = restrictTo(USER_ROLES.MECHANIC)

// Browsing is public.
router.get('/', acc.listAccessories)
router.get('/categories', acc.listCategories)

// Mechanic (seller) side. Static paths come before `/:id`.
router.get('/mine', protect, mechanic, acc.getMyAccessories)
router.get('/inquiries/received', protect, mechanic, acc.getReceivedInquiries)
router.patch(
  '/inquiries/:inquiryId',
  protect,
  mechanic,
  [param('inquiryId').isMongoId().withMessage('Invalid enquiry id')],
  validateRequest,
  acc.setInquiryStatus,
)
router.post('/', protect, mechanic, acc.createAccessory)
router.patch('/:id', protect, mechanic, idParam, validateRequest, acc.updateAccessory)
router.delete('/:id', protect, mechanic, idParam, validateRequest, acc.deleteAccessory)

// Customer side
router.get('/inquiries/sent', protect, customer, acc.getMyInquiries)
router.post('/:id/inquiry', protect, customer, idParam, validateRequest, acc.createInquiry)
router.get('/:id/seller-contact', protect, customer, idParam, validateRequest, acc.getSellerContact)

router.get('/:id', idParam, validateRequest, optionalAuth, acc.getAccessory)

export default router
