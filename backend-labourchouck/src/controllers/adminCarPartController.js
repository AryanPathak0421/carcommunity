import mongoose from 'mongoose'
import { CarPart } from '../models/CarPart.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { LOW_STOCK_AT, stockStatus } from '../services/partsService.js'
import { normalizeStoredMediaUrl } from '../utils/mediaUrl.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max))

const withStatus = (p) => ({ ...p, status: stockStatus(p.stock) })

/** Validate and normalise the editable fields. Returns { error } or { data }. */
function readPartBody(body, { partial = false } = {}) {
  const data = {}
  const has = (k) => body[k] !== undefined

  if (!partial || has('name')) {
    const name = str(body.name, 120)
    if (!name) return { error: 'Part name is required' }
    data.name = name
  }
  if (has('brand')) data.brand = str(body.brand, 60)
  if (has('partNumber')) data.partNumber = str(body.partNumber, 60)
  if (has('description')) data.description = str(body.description, 1000)

  if (has('imageUrl')) {
    const url = normalizeStoredMediaUrl(body.imageUrl)
    if (url === null) return { error: 'Image must be an https link' }
    data.imageUrl = url
  }

  if (!partial || has('price')) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 1 || price > 1000000) return { error: 'Price must be between ₹1 and ₹10,00,000' }
    data.price = Math.round(price * 100) / 100
  }
  if (has('mrp')) {
    if (body.mrp === null || body.mrp === '') data.mrp = null
    else {
      const mrp = Number(body.mrp)
      if (!Number.isFinite(mrp) || mrp < 0 || mrp > 1000000) return { error: 'MRP must be a valid amount' }
      data.mrp = mrp
    }
  }
  if (!partial || has('stock')) {
    const stock = Number(body.stock ?? 0)
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) return { error: 'Stock must be a whole number (0 or more)' }
    data.stock = stock
  }
  if (has('isActive')) data.isActive = Boolean(body.isActive)

  if (has('subcategoryIds')) {
    const ids = Array.isArray(body.subcategoryIds) ? body.subcategoryIds : []
    if (ids.length > 100 || ids.some((id) => !mongoose.isValidObjectId(id))) return { error: 'Invalid service categories' }
    data.subcategoryIds = ids
  }
  return { data }
}

/** GET /admin/car-parts?search=&status=&page=&limit= */
export const listParts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const filter = {}

  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : ''
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: rx }, { brand: rx }, { partNumber: rx }]
  }
  const status = req.query.status
  if (status === 'OUT_OF_STOCK') filter.stock = 0
  else if (status === 'LOW_STOCK') filter.stock = { $gt: 0, $lte: LOW_STOCK_AT }
  else if (status === 'IN_STOCK') filter.stock = { $gt: LOW_STOCK_AT }
  if (req.query.active === 'true') filter.isActive = true
  if (req.query.active === 'false') filter.isActive = false

  const [items, total, outOfStock, lowStock] = await Promise.all([
    CarPart.find(filter)
      .populate('subcategoryIds', 'name')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CarPart.countDocuments(filter),
    CarPart.countDocuments({ stock: 0 }),
    CarPart.countDocuments({ stock: { $gt: 0, $lte: LOW_STOCK_AT } }),
  ])

  return sendSuccess(res, {
    data: {
      parts: items.map(withStatus),
      counts: { outOfStock, lowStock },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  })
})

/** POST /admin/car-parts */
export const createPart = asyncHandler(async (req, res) => {
  const { error, data } = readPartBody(req.body)
  if (error) return sendError(res, { message: error, statusCode: HTTP_STATUS.BAD_REQUEST })
  const part = await CarPart.create(data)
  return sendSuccess(res, { message: 'Part added', statusCode: HTTP_STATUS.CREATED, data: { part: withStatus(part.toObject()) } })
})

/** PATCH /admin/car-parts/:id */
export const updatePart = asyncHandler(async (req, res) => {
  const { error, data } = readPartBody(req.body, { partial: true })
  if (error) return sendError(res, { message: error, statusCode: HTTP_STATUS.BAD_REQUEST })
  const part = await CarPart.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }).lean()
  if (!part) return sendError(res, { message: 'Part not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Part updated', data: { part: withStatus(part) } })
})

/**
 * PATCH /admin/car-parts/:id/stock  { delta: +20 }  or  { stock: 50 }
 * `delta` is applied atomically so it cannot clash with a customer reserving units at the same time.
 */
export const adjustStock = asyncHandler(async (req, res) => {
  const { delta, stock } = req.body
  let part
  if (delta !== undefined) {
    const d = Number(delta)
    if (!Number.isInteger(d) || d === 0 || Math.abs(d) > 1000000) {
      return sendError(res, { message: 'Enter a whole number to add or remove', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    // never let a removal take the shelf below zero
    const filter = d < 0 ? { _id: req.params.id, stock: { $gte: -d } } : { _id: req.params.id }
    part = await CarPart.findOneAndUpdate(filter, { $inc: { stock: d } }, { new: true }).lean()
    if (!part) {
      const exists = await CarPart.exists({ _id: req.params.id })
      return sendError(res, {
        message: exists ? 'Not enough stock to remove that many' : 'Part not found',
        statusCode: exists ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.NOT_FOUND,
      })
    }
  } else {
    const s = Number(stock)
    if (!Number.isInteger(s) || s < 0 || s > 1000000) {
      return sendError(res, { message: 'Stock must be a whole number (0 or more)', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    part = await CarPart.findByIdAndUpdate(req.params.id, { $set: { stock: s } }, { new: true }).lean()
    if (!part) return sendError(res, { message: 'Part not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  return sendSuccess(res, { message: 'Stock updated', data: { part: withStatus(part) } })
})

/** DELETE /admin/car-parts/:id — bookings keep their own snapshot of the part, so this is safe. */
export const deletePart = asyncHandler(async (req, res) => {
  const part = await CarPart.findByIdAndDelete(req.params.id)
  if (!part) return sendError(res, { message: 'Part not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Part deleted', data: null })
})
