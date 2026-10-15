import { Router } from 'express'
import { protect, restrictTo } from '../middleware/auth.js'
import { USER_ROLES } from '../constants/roles.js'
import * as cfg from '../controllers/serviceUiConfigController.js'

/** Public read for the customer app. */
export const publicServiceUiRoutes = Router()
publicServiceUiRoutes.get('/service-ui', cfg.getPublicConfig)

/** Admin read / write. */
export const adminServiceUiRoutes = Router()
adminServiceUiRoutes.use(protect, restrictTo(USER_ROLES.ADMIN))
adminServiceUiRoutes.get('/', cfg.getAdminConfig)
adminServiceUiRoutes.put('/', cfg.saveAdminConfig)
