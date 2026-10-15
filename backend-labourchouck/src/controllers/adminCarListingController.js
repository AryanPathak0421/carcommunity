import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { sendToUser } from '../services/notificationService.js'
import { CarListing, CarInquiry, CAR_LISTING_STATUS } from '../models/CarListing.js'
import { CarMake, CarOptions } from '../models/CarCatalog.js'
import { ensureCarCatalog, getCarMakes, getCarOptions } from '../services/carCatalogService.js'
import { slugify } from '../utils/slugify.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const str = (v) => (v == null ? '' : String(v).trim())

function shape(l) {
  const seller = l.sellerId && typeof l.sellerId === 'object' ? l.sellerId : null
  return {
    ...l,
    sellerId: seller ? seller._id : l.sellerId,
    seller: seller
      ? { _id: seller._id, name: seller.fullName, phone: seller.phone, email: seller.email, isActive: seller.isActive }
      : null,
  }
}

export const listCarListings = asyncHandler(async (req, res) => {
  const filter = {}
  const status = str(req.query.status).toUpperCase()
  if (status && Object.values(CAR_LISTING_STATUS).includes(status)) filter.status = status
  const search = str(req.query.q)
  if (search) {
    const re = new RegExp(escapeRegex(search).slice(0, 60), 'i')
    filter.$or = [{ title: re }, { make: re }, { model: re }, { city: re }]
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

  const [items, total, counts] = await Promise.all([
    CarListing.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sellerId', 'fullName phone email isActive')
      .lean(),
    CarListing.countDocuments(filter),
    CarListing.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0, SOLD: 0 }
  for (const c of counts) byStatus[c._id] = c.n

  return sendSuccess(res, {
    data: {
      listings: items.map(shape),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts: byStatus,
    },
  })
})

export const reviewCarListing = asyncHandler(async (req, res) => {
  const action = str(req.body.action).toLowerCase()
  const note = str(req.body.note).slice(0, 500)
  if (!['approve', 'reject'].includes(action)) {
    return sendError(res, { message: 'action must be approve or reject', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  if (action === 'reject' && !note) {
    return sendError(res, { message: 'Add a reason so the seller knows what to fix', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const listing = await CarListing.findById(req.params.id)
  if (!listing) return sendError(res, { message: 'Listing not found', statusCode: HTTP_STATUS.NOT_FOUND })
  if (listing.status === CAR_LISTING_STATUS.SOLD) {
    return sendError(res, { message: 'A sold listing cannot be reviewed', statusCode: HTTP_STATUS.CONFLICT })
  }

  listing.status = action === 'approve' ? CAR_LISTING_STATUS.APPROVED : CAR_LISTING_STATUS.REJECTED
  listing.adminNote = note
  listing.reviewedAt = new Date()
  listing.reviewedBy = req.user._id
  if (action === 'reject') listing.isFeatured = false
  await listing.save()

  sendToUser(listing.sellerId, {
    title: action === 'approve' ? 'Your car is live' : 'Your car listing needs changes',
    body: action === 'approve' ? `${listing.title} is now visible to buyers.` : `${listing.title}: ${note}`,
    type: action === 'approve' ? 'CAR_LISTING_APPROVED' : 'CAR_LISTING_REJECTED',
    data: { listingId: String(listing._id), link: `/app/cars/${listing._id}` },
  })

  return sendSuccess(res, {
    message: action === 'approve' ? 'Listing approved' : 'Listing rejected',
    data: { listing },
  })
})

export const toggleFeaturedCarListing = asyncHandler(async (req, res) => {
  const listing = await CarListing.findById(req.params.id)
  if (!listing) return sendError(res, { message: 'Listing not found', statusCode: HTTP_STATUS.NOT_FOUND })
  if (listing.status !== CAR_LISTING_STATUS.APPROVED) {
    return sendError(res, { message: 'Only a live listing can be featured', statusCode: HTTP_STATUS.CONFLICT })
  }
  listing.isFeatured = req.body.isFeatured === undefined ? !listing.isFeatured : Boolean(req.body.isFeatured)
  await listing.save()
  return sendSuccess(res, { message: listing.isFeatured ? 'Featured' : 'Removed from featured', data: { listing } })
})

export const deleteCarListing = asyncHandler(async (req, res) => {
  const listing = await CarListing.findById(req.params.id)
  if (!listing) return sendError(res, { message: 'Listing not found', statusCode: HTTP_STATUS.NOT_FOUND })
  await Promise.all([listing.deleteOne(), CarInquiry.deleteMany({ listingId: listing._id })])
  sendToUser(listing.sellerId, {
    title: 'Car listing removed',
    body: `${listing.title} was removed by the CarCommunity team.`,
    type: 'CAR_LISTING_REMOVED',
    data: { link: '/app/cars/my' },
  })
  return sendSuccess(res, { message: 'Listing deleted' })
})

export const listCarInquiries = asyncHandler(async (req, res) => {
  const filter = {}
  const status = str(req.query.status).toUpperCase()
  if (['NEW', 'CONTACTED', 'CLOSED'].includes(status)) filter.status = status
  if (str(req.query.listingId)) filter.listingId = str(req.query.listingId)
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

  const [items, total] = await Promise.all([
    CarInquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('listingId', 'title price images status city')
      .populate('sellerId', 'fullName phone')
      .lean(),
    CarInquiry.countDocuments(filter),
  ])
  return sendSuccess(res, {
    data: {
      inquiries: items.map((i) => ({
        _id: i._id,
        listing: i.listingId
          ? {
              _id: i.listingId._id,
              title: i.listingId.title,
              price: i.listingId.price,
              status: i.listingId.status,
              city: i.listingId.city,
              image: i.listingId.images?.[0] || '',
            }
          : null,
        seller: i.sellerId ? { name: i.sellerId.fullName, phone: i.sellerId.phone } : null,
        buyerName: i.buyerName,
        buyerPhone: i.buyerPhone,
        message: i.message,
        offerPrice: i.offerPrice,
        status: i.status,
        createdAt: i.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  })
})

export const setCarInquiryStatus = asyncHandler(async (req, res) => {
  const status = str(req.body.status).toUpperCase()
  if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
    return sendError(res, { message: 'Invalid status', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const inquiry = await CarInquiry.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true })
  if (!inquiry) return sendError(res, { message: 'Inquiry not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Inquiry updated', data: { inquiry } })
})

// ---------------------------------------------------------------------------
// Catalogue: makes / models / variants and the dropdown options
// ---------------------------------------------------------------------------

const cleanList = (arr, max, len) => {
  if (!Array.isArray(arr)) return null
  const out = []
  for (const v of arr) {
    const s = str(v).slice(0, len)
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s)
    if (out.length >= max) break
  }
  return out
}

function cleanModels(input) {
  if (!Array.isArray(input)) return null
  const seen = new Set()
  const out = []
  for (const m of input) {
    const name = str(typeof m === 'string' ? m : m?.name).slice(0, 60)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push({ name, variants: cleanList(typeof m === 'string' ? [] : m?.variants || [], 40, 60) || [] })
    if (out.length >= 200) break
  }
  return out
}

export const getCatalog = asyncHandler(async (_req, res) => {
  const [makes, options] = await Promise.all([getCarMakes({ includeInactive: true }), getCarOptions()])
  return sendSuccess(res, { data: { makes, options } })
})

export const createMake = asyncHandler(async (req, res) => {
  const name = str(req.body.name).slice(0, 60)
  if (!name) return sendError(res, { message: 'Make name is required', statusCode: HTTP_STATUS.BAD_REQUEST })
  const slug = slugify(name)
  if (await CarMake.exists({ slug })) {
    return sendError(res, { message: 'This make already exists', statusCode: HTTP_STATUS.CONFLICT })
  }
  const last = await CarMake.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean()
  const make = await CarMake.create({
    name,
    slug,
    models: cleanModels(req.body.models) || [],
    sortOrder: (last?.sortOrder ?? -1) + 1,
  })
  return sendSuccess(res, { message: 'Make added', data: { make }, statusCode: HTTP_STATUS.CREATED })
})

export const updateMake = asyncHandler(async (req, res) => {
  const make = await CarMake.findById(req.params.id)
  if (!make) return sendError(res, { message: 'Make not found', statusCode: HTTP_STATUS.NOT_FOUND })

  if (req.body.name !== undefined) {
    const name = str(req.body.name).slice(0, 60)
    if (!name) return sendError(res, { message: 'Make name is required', statusCode: HTTP_STATUS.BAD_REQUEST })
    const slug = slugify(name)
    if (slug !== make.slug && (await CarMake.exists({ slug }))) {
      return sendError(res, { message: 'Another make already uses this name', statusCode: HTTP_STATUS.CONFLICT })
    }
    make.name = name
    make.slug = slug
  }
  if (req.body.models !== undefined) {
    const models = cleanModels(req.body.models)
    if (!models) return sendError(res, { message: 'models must be a list', statusCode: HTTP_STATUS.BAD_REQUEST })
    make.models = models
  }
  if (req.body.isActive !== undefined) make.isActive = Boolean(req.body.isActive)
  if (req.body.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))) make.sortOrder = Number(req.body.sortOrder)
  await make.save()
  return sendSuccess(res, { message: 'Make updated', data: { make } })
})

export const deleteMake = asyncHandler(async (req, res) => {
  const make = await CarMake.findByIdAndDelete(req.params.id)
  if (!make) return sendError(res, { message: 'Make not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Make removed' })
})

function cleanOptionItems(input) {
  if (!Array.isArray(input)) return null
  const seen = new Set()
  const out = []
  for (const o of input) {
    const label = str(o?.label).slice(0, 40)
    const value = str(o?.value || label).toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_|_$/g, '').slice(0, 30)
    if (!label || !value || seen.has(value)) continue
    seen.add(value)
    out.push({ value, label, isActive: o?.isActive !== false })
  }
  return out
}

export const saveOptions = asyncHandler(async (req, res) => {
  const update = {}
  if (req.body.fuelTypes !== undefined) {
    const v = cleanOptionItems(req.body.fuelTypes)
    if (!v || !v.some((o) => o.isActive)) {
      return sendError(res, { message: 'Keep at least one active fuel type', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    update.fuelTypes = v
  }
  if (req.body.transmissions !== undefined) {
    const v = cleanOptionItems(req.body.transmissions)
    if (!v || !v.some((o) => o.isActive)) {
      return sendError(res, { message: 'Keep at least one active transmission', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    update.transmissions = v
  }
  if (req.body.cities !== undefined) {
    const v = cleanList(req.body.cities, 300, 80)
    if (!v) return sendError(res, { message: 'cities must be a list', statusCode: HTTP_STATUS.BAD_REQUEST })
    update.cities = v
  }
  if (req.body.maxPhotos !== undefined) {
    const n = Number(req.body.maxPhotos)
    if (!Number.isInteger(n) || n < 1 || n > 15) {
      return sendError(res, { message: 'maxPhotos must be between 1 and 15', statusCode: HTTP_STATUS.BAD_REQUEST })
    }
    update.maxPhotos = n
  }
  await ensureCarCatalog()
  const options = await CarOptions.findOneAndUpdate({ key: 'default' }, { $set: update }, { new: true }).lean()
  return sendSuccess(res, { message: 'Options saved', data: { options } })
})
