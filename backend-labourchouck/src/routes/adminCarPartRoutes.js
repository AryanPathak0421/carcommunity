import { Router } from 'express'
import { param } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { USER_ROLES } from '../constants/roles.js'
import * as admin from '../controllers/adminCarPartController.js'

const router = Router()
router.use(protect, restrictTo(USER_ROLES.ADMIN))
const id = [param('id').isMongoId().withMessage('Invalid id')]

router.get('/', admin.listParts)
router.post('/', admin.createPart)
router.patch('/:id', id, validateRequest, admin.updatePart)
router.patch('/:id/stock', id, validateRequest, admin.adjustStock)
router.delete('/:id', id, validateRequest, admin.deletePart)

export default router
