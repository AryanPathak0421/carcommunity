import { Router } from 'express'
import { param } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as admin from '../controllers/adminAccessoryController.js'

const router = Router()
router.use(protect, restrictTo(USER_ROLES.ADMIN))
const id = [param('id').isMongoId().withMessage('Invalid id')]

router.get('/categories', admin.listCategories)
router.post('/categories', admin.createCategory)
router.patch('/categories/:id', id, validateRequest, admin.updateCategory)
router.delete('/categories/:id', id, validateRequest, admin.deleteCategory)

router.get('/inquiries', admin.listInquiries)
router.patch('/inquiries/:id', id, validateRequest, admin.setInquiryStatus)

router.get('/', admin.listProducts)
router.patch('/:id/review', id, validateRequest, admin.reviewProduct)
router.patch('/:id/featured', id, validateRequest, admin.toggleFeatured)
router.delete('/:id', id, validateRequest, admin.deleteProduct)

export default router
