import { CarPart } from '../models/CarPart.js'
import { LabourService } from '../models/LabourService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { publicPart } from '../services/partsService.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * GET /car-parts?serviceId=&q=
 * Active parts offered with a service (parts with no service restriction are offered with all),
 * in-stock first, each with its availability.
 */
export const listAvailableParts = asyncHandler(async (req, res) => {
  const { serviceId, q } = req.query
  const filter = { isActive: true }

  if (serviceId) {
    if (!/^[a-f0-9]{24}$/i.test(String(serviceId))) {
      return sendError(res, { message: 'Invalid serviceId', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    const service = await LabourService.findById(serviceId).select('subcategoryId').lean()
    if (!service) return sendError(res, { message: 'Service not found', statusCode: HTTP_STATUS.NOT_FOUND })
    filter.$or = [{ subcategoryIds: { $size: 0 } }, { subcategoryIds: service.subcategoryId }]
  }

  const term = typeof q === 'string' ? q.trim().slice(0, 60) : ''
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i')
    filter.$and = [{ $or: [{ name: rx }, { brand: rx }, { partNumber: rx }] }]
  }

  const parts = await CarPart.find(filter).sort({ name: 1 }).limit(100).lean()
  const items = parts.map(publicPart).sort((a, b) => Number(b.available) - Number(a.available))
  return sendSuccess(res, { data: { parts: items } })
})
