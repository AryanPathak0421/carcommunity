import { Router } from 'express'
import { param } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as admin from '../controllers/adminCarListingController.js'

const router = Router()
router.use(protect, restrictTo(USER_ROLES.ADMIN))

const id = [param('id').isMongoId().withMessage('Invalid id')]

router.get('/catalog', admin.getCatalog)
router.put('/catalog/options', admin.saveOptions)
router.post('/catalog/makes', admin.createMake)
router.patch('/catalog/makes/:id', id, validateRequest, admin.updateMake)
router.delete('/catalog/makes/:id', id, validateRequest, admin.deleteMake)

router.get('/', admin.listCarListings)
router.get('/inquiries', admin.listCarInquiries)
router.patch('/inquiries/:id', id, validateRequest, admin.setCarInquiryStatus)
router.patch('/:id/review', id, validateRequest, admin.reviewCarListing)
router.patch('/:id/featured', id, validateRequest, admin.toggleFeaturedCarListing)
router.delete('/:id', id, validateRequest, admin.deleteCarListing)

export default router
