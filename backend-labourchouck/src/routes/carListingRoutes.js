import { Router } from 'express'
import { param } from 'express-validator'
import { optionalAuth, protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as cars from '../controllers/carListingController.js'

const router = Router()
const idParam = [param('id').isMongoId().withMessage('Invalid listing id')]
const customer = restrictTo(USER_ROLES.INDIVIDUAL)

// Browsing is public.
router.get('/', cars.listCars)
router.get('/filters', cars.getCarFilters)
router.get('/catalog', cars.getCatalog)

// Everything below needs a signed-in customer; static paths are declared before `/:id` so they win.
router.get('/mine', protect, customer, cars.getMyCars)
router.get('/inquiries/received', protect, customer, cars.getReceivedInquiries)
router.get('/inquiries/sent', protect, customer, cars.getMyInquiries)
router.patch(
  '/inquiries/:inquiryId',
  protect,
  customer,
  [param('inquiryId').isMongoId().withMessage('Invalid inquiry id')],
  validateRequest,
  cars.setInquiryStatus,
)

router.post('/', protect, customer, cars.createCar)

router.get('/:id', idParam, validateRequest, optionalAuth, cars.getCar)
router.patch('/:id', protect, customer, idParam, validateRequest, cars.updateCar)
router.patch('/:id/sold', protect, customer, idParam, validateRequest, cars.markCarSold)
router.delete('/:id', protect, customer, idParam, validateRequest, cars.deleteCar)
router.post('/:id/inquiry', protect, customer, idParam, validateRequest, cars.createInquiry)
router.get('/:id/seller-contact', protect, customer, idParam, validateRequest, cars.getSellerContact)

export default router
