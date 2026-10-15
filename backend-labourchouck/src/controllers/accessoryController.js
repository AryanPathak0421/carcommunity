import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { isAllowedStoredMediaUrl } from '../utils/mediaUrl.js'
import { slugify } from '../utils/slugify.js'
import { sendToUser, notifyAdmins } from '../services/notificationService.js'
import { User } from '../models/User.js'
import {
  Accessory,
  AccessoryCategory,
  AccessoryInquiry,
  ACCESSORY_STATUS,
} from '../models/Accessory.js'

const MAX_IMAGES = 6
const OPEN_LIMIT = 50 // pending + approved products per mechanic
const PAGE_LIMIT_MAX = 50

const DEFAULT_CATEGORIES = [
  'Seat Covers', 'Floor Mats', 'Car Care & Cleaning', 'Audio & Electronics', 'Lights & Lamps',
  'Wheels & Tyre Accessories', 'Safety & Security', 'Interior Accessories', 'Exterior Accessories', 'Tools & Emergency Kits',
]

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const str = (v) => (v == null ? '' : String(v).trim())
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))

let seeding = null
/** First use only: starter categories the admin can edit. Never overwrites later edits. */
export async function ensureAccessoryCategories() {
  if (seeding) return seeding
  seeding = (async () => {
    if ((await AccessoryCategory.estimatedDocumentCount()) > 0) return
    try {
      await AccessoryCategory.insertMany(
        DEFAULT_CATEGORIES.map((name, i) => ({ name, slug: slugify(name), sortOrder: i })),
        { ordered: false },
      )
    } catch {
      /* concurrent seed: the unique slug protects us */
    }
  })().finally(() => {
    seeding = null
  })
  return seeding
}

async function activeCategories() {
  await ensureAccessoryCategories()
  return AccessoryCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()
}

function publicProduct(a, seller, category) {
  return {
    _id: a._id,
    name: a.name,
    category: category ? { _id: category._id, name: category.name } : a.categoryId?.name ? { _id: a.categoryId._id, name: a.categoryId.name } : null,
    brand: a.brand,
    description: a.description,
    price: a.price,
    mrp: a.mrp,
    stock: a.stock,
    inStock: a.stock > 0,
    condition: a.condition,
    compatibility: a.compatibility,
    warranty: a.warranty,
    images: a.images,
    isFeatured: a.isFeatured,
    status: a.status,
    views: a.views,
    createdAt: a.createdAt,
    seller: seller ? { name: seller.fullName || 'Seller' } : undefined,
  }
}

const ownerProduct = (a) => ({
  ...publicProduct(a),
  adminNote: a.adminNote,
  inquiryCount: a.inquiryCount,
  reviewedAt: a.reviewedAt,
  updatedAt: a.updatedAt,
})

async function parseBody(body, { partial = false } = {}) {
  const out = {}
  const bad = (message) => ({ error: message })
  const has = (k) => body[k] !== undefined

  const text = (key, label, max, required = false) => {
    if (!has(key)) return required && !partial ? `${label} is required` : null
    const v = str(body[key])
    if (required && !v) return `${label} is required`
    if (v.length > max) return `${label} is too long`
    out[key] = v
    return null
  }
  for (const err of [
    text('name', 'Product name', 120, true),
    text('brand', 'Brand', 60),
    text('description', 'Description', 2000),
    text('compatibility', 'Compatibility', 200),
    text('warranty', 'Warranty', 80),
  ]) {
    if (err) return bad(err)
  }

  const numberField = (key, label, min, max, { required = false, integer = false } = {}) => {
    if (!has(key) || body[key] === '' || body[key] === null) {
      if (key === 'mrp' && has(key)) out.mrp = null
      return required && !partial ? `${label} is required` : null
    }
    const n = num(body[key])
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      return `${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}`
    }
    out[key] = n
    return null
  }
  for (const err of [
    numberField('price', 'Price', 1, 10000000, { required: true }),
    numberField('mrp', 'MRP', 1, 10000000),
    numberField('stock', 'Stock', 0, 100000, { required: true, integer: true }),
  ]) {
    if (err) return bad(err)
  }
  if (out.mrp != null && out.price != null && out.mrp < out.price) return bad('MRP cannot be lower than the selling price')

  if (has('condition')) {
    const c = str(body.condition).toUpperCase()
    if (!['NEW', 'USED'].includes(c)) return bad('Condition must be NEW or USED')
    out.condition = c
  }

  if (has('categoryId') || !partial) {
    const cat = await AccessoryCategory.findById(body.categoryId).lean().catch(() => null)
    if (!cat || !cat.isActive) return bad('Select a valid category')
    out.categoryId = cat._id
  }

  if (has('images')) {
    if (!Array.isArray(body.images)) return bad('images must be a list of URLs')
    const imgs = body.images.map(str).filter(Boolean)
    if (imgs.length > MAX_IMAGES) return bad(`You can add up to ${MAX_IMAGES} photos`)
    if (!imgs.every(isAllowedStoredMediaUrl)) return bad('One of the photo URLs is not allowed')
    out.images = imgs
  }
  if (!partial && (!out.images || out.images.length === 0)) return bad('Add at least one photo')
  if (partial && out.images && out.images.length === 0) return bad('Add at least one photo')
  return { value: out }
}

// ---------------------------------------------------------------------------
// Public browsing
// ---------------------------------------------------------------------------

export const listCategories = asyncHandler(async (_req, res) => {
  const cats = await activeCategories()
  // only categories that have live products matter to shoppers, but keep all active ones for sellers
  const counts = await Accessory.aggregate([
    { $match: { status: ACCESSORY_STATUS.APPROVED } },
    { $group: { _id: '$categoryId', n: { $sum: 1 } } },
  ])
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]))
  return sendSuccess(res, {
    data: { categories: cats.map((c) => ({ _id: c._id, name: c.name, slug: c.slug, count: byId[String(c._id)] || 0 })) },
  })
})

export const listAccessories = asyncHandler(async (req, res) => {
  const q = req.query
  const filter = { status: ACCESSORY_STATUS.APPROVED }
  if (/^[a-f0-9]{24}$/i.test(str(q.category))) filter.categoryId = str(q.category)
  const search = str(q.q)
  if (search) {
    const re = new RegExp(escapeRegex(search).slice(0, 60), 'i')
    filter.$or = [{ name: re }, { brand: re }, { compatibility: re }, { description: re }]
  }
  if (str(q.condition)) filter.condition = str(q.condition).toUpperCase()
  if (q.inStock === 'true') filter.stock = { $gt: 0 }
  const min = num(q.minPrice)
  const max = num(q.maxPrice)
  if ((min != null && Number.isFinite(min)) || (max != null && Number.isFinite(max))) {
    filter.price = {}
    if (min != null && Number.isFinite(min)) filter.price.$gte = min
    if (max != null && Number.isFinite(max)) filter.price.$lte = max
  }

  const SORTS = {
    newest: { isFeatured: -1, createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
  }
  const sort = SORTS[str(q.sort)] || SORTS.newest
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1)
  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, Number.parseInt(q.limit, 10) || 12))

  const [items, total] = await Promise.all([
    Accessory.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('categoryId', 'name')
      .populate('sellerId', 'fullName')
      .lean(),
    Accessory.countDocuments(filter),
  ])
  return sendSuccess(res, {
    data: {
      products: items.map((a) => publicProduct(a, a.sellerId)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  })
})

export const getAccessory = asyncHandler(async (req, res) => {
  const a = await Accessory.findById(req.params.id).populate('categoryId', 'name').populate('sellerId', 'fullName')
  const viewerId = req.user?._id ? String(req.user._id) : null
  const sellerId = a ? String(a.sellerId?._id || a.sellerId) : null
  const isOwner = Boolean(viewerId && sellerId === viewerId)
  const isAdmin = req.user?.role === 'admin'
  if (!a || !(isOwner || isAdmin || a.status === ACCESSORY_STATUS.APPROVED)) {
    return sendError(res, { message: 'Product not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  if (!isOwner && a.status === ACCESSORY_STATUS.APPROVED) {
    Accessory.updateOne({ _id: a._id }, { $inc: { views: 1 } }).catch(() => {})
  }
  let myInquiry = null
  if (viewerId && !isOwner) {
    myInquiry = await AccessoryInquiry.findOne({ accessoryId: a._id, buyerId: viewerId })
      .select('status quantity message createdAt')
      .lean()
  }
  const base = isOwner || isAdmin ? ownerProduct(a) : publicProduct(a)
  return sendSuccess(res, {
    data: { product: { ...base, seller: { name: a.sellerId?.fullName || 'Seller' } }, isOwner, myInquiry },
  })
})

// ---------------------------------------------------------------------------
// Mechanic (seller)
// ---------------------------------------------------------------------------

function requireVerifiedMechanic(req, res) {
  if (req.user.labourProfile?.kycStatus !== 'verified') {
    sendError(res, {
      message: 'Complete your KYC verification to list products',
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'KYC_REQUIRED',
    })
    return false
  }
  return true
}

export const createAccessory = asyncHandler(async (req, res) => {
  if (!requireVerifiedMechanic(req, res)) return
  const parsed = await parseBody(req.body)
  if (parsed.error) return sendError(res, { message: parsed.error, statusCode: HTTP_STATUS.BAD_REQUEST })

  const open = await Accessory.countDocuments({
    sellerId: req.user._id,
    status: { $in: [ACCESSORY_STATUS.PENDING, ACCESSORY_STATUS.APPROVED] },
  })
  if (open >= OPEN_LIMIT) {
    return sendError(res, {
      message: `You can have up to ${OPEN_LIMIT} active products. Remove one first.`,
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }

  const a = await Accessory.create({ ...parsed.value, sellerId: req.user._id, status: ACCESSORY_STATUS.PENDING })
  notifyAdmins({
    title: 'New accessory to review',
    body: `${a.name} · ₹${a.price.toLocaleString('en-IN')}`,
    type: 'ACCESSORY_SUBMITTED',
    data: { accessoryId: String(a._id), link: '/admin/accessories' },
  })
  return sendSuccess(res, {
    message: 'Product submitted for review',
    data: { product: ownerProduct(a) },
    statusCode: HTTP_STATUS.CREATED,
  })
})

export const getMyAccessories = asyncHandler(async (req, res) => {
  const items = await Accessory.find({ sellerId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('categoryId', 'name')
    .lean()
  return sendSuccess(res, { data: { products: items.map(ownerProduct) } })
})

async function loadOwned(req, res) {
  const a = await Accessory.findById(req.params.id)
  if (!a || String(a.sellerId) !== String(req.user._id)) {
    sendError(res, { message: 'Product not found', statusCode: HTTP_STATUS.NOT_FOUND })
    return null
  }
  return a
}

export const updateAccessory = asyncHandler(async (req, res) => {
  const a = await loadOwned(req, res)
  if (!a) return
  const parsed = await parseBody(req.body, { partial: true })
  if (parsed.error) return sendError(res, { message: parsed.error, statusCode: HTTP_STATUS.BAD_REQUEST })

  // Only price / stock changes are safe to apply without a fresh review. Compare with the stored
  // values so a form that re-sends every field does not force a review for an unchanged product.
  const same = (cur, next) =>
    Array.isArray(next) ? JSON.stringify(cur || []) === JSON.stringify(next) : String(cur ?? '') === String(next ?? '')
  const changed = Object.entries(parsed.value)
    .filter(([k, v]) => !same(a[k], v))
    .map(([k]) => k)
  const quick = changed.every((k) => ['price', 'mrp', 'stock'].includes(k)) && a.status === ACCESSORY_STATUS.APPROVED
  Object.assign(a, parsed.value)
  if (!quick) {
    a.status = ACCESSORY_STATUS.PENDING
    a.adminNote = ''
    a.isFeatured = false
  }
  await a.save()
  if (!quick) {
    notifyAdmins({
      title: 'Accessory updated — review again',
      body: a.name,
      type: 'ACCESSORY_SUBMITTED',
      data: { accessoryId: String(a._id), link: '/admin/accessories' },
    })
  }
  return sendSuccess(res, {
    message: quick ? 'Product updated' : 'Product updated and sent for review',
    data: { product: ownerProduct(a) },
  })
})

export const deleteAccessory = asyncHandler(async (req, res) => {
  const a = await loadOwned(req, res)
  if (!a) return
  await Promise.all([a.deleteOne(), AccessoryInquiry.deleteMany({ accessoryId: a._id })])
  return sendSuccess(res, { message: 'Product removed' })
})

export const getReceivedInquiries = asyncHandler(async (req, res) => {
  const items = await AccessoryInquiry.find({ sellerId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('accessoryId', 'name images price status')
    .lean()
  return sendSuccess(res, {
    data: {
      inquiries: items.map((i) => ({
        _id: i._id,
        product: i.accessoryId
          ? { _id: i.accessoryId._id, name: i.accessoryId.name, image: i.accessoryId.images?.[0] || '', price: i.accessoryId.price }
          : null,
        buyerName: i.buyerName,
        buyerPhone: i.buyerPhone,
        quantity: i.quantity,
        message: i.message,
        status: i.status,
        createdAt: i.createdAt,
      })),
    },
  })
})

export const setInquiryStatus = asyncHandler(async (req, res) => {
  const status = str(req.body.status).toUpperCase()
  if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
    return sendError(res, { message: 'Invalid status', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const inq = await AccessoryInquiry.findOneAndUpdate(
    { _id: req.params.inquiryId, sellerId: req.user._id },
    { $set: { status } },
    { new: true },
  )
  if (!inq) return sendError(res, { message: 'Enquiry not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Enquiry updated', data: { inquiry: inq } })
})

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export const createInquiry = asyncHandler(async (req, res) => {
  const a = await Accessory.findById(req.params.id)
  if (!a || a.status !== ACCESSORY_STATUS.APPROVED) {
    return sendError(res, { message: 'This product is no longer available', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  if (a.stock <= 0) {
    return sendError(res, { message: 'This product is out of stock', statusCode: HTTP_STATUS.CONFLICT })
  }
  const quantity = Math.max(1, Math.min(1000, Number.parseInt(req.body.quantity, 10) || 1))
  if (quantity > a.stock) {
    return sendError(res, { message: `Only ${a.stock} in stock`, statusCode: HTTP_STATUS.CONFLICT })
  }
  const buyer = await User.findById(req.user._id).select('fullName phone').lean()
  if (!str(buyer?.phone)) {
    return sendError(res, { message: 'Add a phone number to your profile first', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  let inq
  try {
    inq = await AccessoryInquiry.create({
      accessoryId: a._id,
      sellerId: a.sellerId,
      buyerId: req.user._id,
      buyerName: buyer.fullName || '',
      buyerPhone: buyer.phone,
      quantity,
      message: str(req.body.message).slice(0, 500),
    })
  } catch (e) {
    if (e?.code === 11000) {
      return sendError(res, { message: 'You have already sent a request for this product', statusCode: HTTP_STATUS.CONFLICT })
    }
    throw e
  }
  await Accessory.updateOne({ _id: a._id }, { $inc: { inquiryCount: 1 } })

  sendToUser(a.sellerId, {
    title: 'New order request',
    body: `${buyer.fullName || 'A customer'} wants ${quantity} × ${a.name}`,
    type: 'ACCESSORY_INQUIRY',
    data: { accessoryId: String(a._id), inquiryId: String(inq._id), link: '/app/accessories/leads' },
  })
  const seller = await User.findById(a.sellerId).select('fullName phone').lean()
  return sendSuccess(res, {
    message: 'Request sent to the seller',
    data: { inquiry: { _id: inq._id, status: inq.status }, seller: { name: seller?.fullName, phone: seller?.phone } },
    statusCode: HTTP_STATUS.CREATED,
  })
})

export const getSellerContact = asyncHandler(async (req, res) => {
  const inq = await AccessoryInquiry.findOne({ accessoryId: req.params.id, buyerId: req.user._id }).lean()
  if (!inq) {
    return sendError(res, { message: 'Send a request to see the seller contact', statusCode: HTTP_STATUS.FORBIDDEN })
  }
  const seller = await User.findById(inq.sellerId).select('fullName phone').lean()
  return sendSuccess(res, { data: { seller: { name: seller?.fullName, phone: seller?.phone } } })
})

export const getMyInquiries = asyncHandler(async (req, res) => {
  const items = await AccessoryInquiry.find({ buyerId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('accessoryId', 'name images price status')
    .lean()
  return sendSuccess(res, {
    data: {
      inquiries: items.map((i) => ({
        _id: i._id,
        product: i.accessoryId
          ? {
              _id: i.accessoryId._id,
              name: i.accessoryId.name,
              image: i.accessoryId.images?.[0] || '',
              price: i.accessoryId.price,
              status: i.accessoryId.status,
            }
          : null,
        quantity: i.quantity,
        message: i.message,
        status: i.status,
        createdAt: i.createdAt,
      })),
    },
  })
})
