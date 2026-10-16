import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as parts from '../controllers/carPartController.js'

const router = Router()

// Any signed-in user can see which parts are in stock for a service.
router.get('/', protect, parts.listAvailableParts)

export default router
