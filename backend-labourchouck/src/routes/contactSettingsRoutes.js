import { Router } from 'express'
import { protect, restrictTo } from '../middleware/auth.js'
import { USER_ROLES } from '../constants/roles.js'
import * as contact from '../controllers/contactSettingsController.js'

/** Public read for the Contact us page. */
export const publicContactRoutes = Router()
publicContactRoutes.get('/', contact.getPublicContact)

/** Admin read / write. */
export const adminContactRoutes = Router()
adminContactRoutes.use(protect, restrictTo(USER_ROLES.ADMIN))
adminContactRoutes.get('/', contact.getAdminContact)
adminContactRoutes.put('/', contact.saveAdminContact)
