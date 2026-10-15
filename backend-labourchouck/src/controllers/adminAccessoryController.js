import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { slugify } from '../utils/slugify.js'
import { sendToUser } from '../services/notificationService.js'
import { Accessory, AccessoryCategory, AccessoryInquiry, ACCESSORY_STATUS } from '../models/Accessory.js'
import { ensureAccessoryCategories } from './accessoryController.js'

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const str = (v) => (v == null ? '' : String(v).trim())

function withSeller(a) {
  const s = a.sellerId && typeof a.sellerId === 'object' ? a.sellerId : null
  return {
    ...a,
    sellerId: s ? s._id : a.sellerId,
    seller: s ? { _id: s._id, name: s.fullName, phone: s.phone, email: s.email } : null,
    category: a.categoryId && typeof a.categoryId === 'object' ? { _id: a.categoryId._id, name: a.categoryId.name } : null,
    categoryId: a.categoryId && typeof a.categoryId === 'object' ? a.categoryId._id : a.categoryId,
  }
}

export const listProducts = asyncHandler(async (req, res) => {
  const filter = {}
  const status = str(req.query.status).toUpperCase()
  if (Object.values(ACCESSORY_STATUS).includes(status)) filter.status = status
  const search = str(req.query.q)
  if (search) {
    const re = new RegExp(escapeRegex(search).slice(0, 60), 'i')
    filter.$or = [{ name: re }, { brand: re }]
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

  const [items, total, counts] = await Promise.all([
    Accessory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sellerId', 'fullName phone email')
      .populate('categoryId', 'name')
      .lean(),
    Accessory.countDocuments(filter),
    Accessory.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  for (const c of counts) byStatus[c._id] = c.n
  return sendSuccess(res, {
    data: { products: items.map(withSeller), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), counts: byStatus },
  })
})

export const reviewProduct = asyncHandler(async (req, res) => {
  const action = str(req.body.action).toLowerCase()
  const note = str(req.body.note).slice(0, 500)
  if (!['approve', 'reject'].includes(action)) {
    return sendError(res, { message: 'action must be approve or reject', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  if (action === 'reject' && !note) {
    return sendError(res, { message: 'Add a reason so the mechanic knows what to fix', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const a = await Accessory.findById(req.params.id)
  if (!a) return sendError(res, { message: 'Product not found', statusCode: HTTP_STATUS.NOT_FOUND })

  a.status = action === 'approve' ? ACCESSORY_STATUS.APPROVED : ACCESSORY_STATUS.REJECTED
  a.adminNote = note
  a.reviewedAt = new Date()
  a.reviewedBy = req.user._id
  if (action === 'reject') a.isFeatured = false
  await a.save()

  sendToUser(a.sellerId, {
    title: action === 'approve' ? 'Your product is live' : 'Your product needs changes',
    body: action === 'approve' ? `${a.name} is now visible to customers.` : `${a.name}: ${note}`,
    type: action === 'approve' ? 'ACCESSORY_APPROVED' : 'ACCESSORY_REJECTED',
    data: { accessoryId: String(a._id), link: '/app/accessories/mine' },
  })
  return sendSuccess(res, { message: action === 'approve' ? 'Product approved' : 'Product rejected', data: { product: a } })
})

export const toggleFeatured = asyncHandler(async (req, res) => {
  const a = await Accessory.findById(req.params.id)
  if (!a) return sendError(res, { message: 'Product not found', statusCode: HTTP_STATUS.NOT_FOUND })
  if (a.status !== ACCESSORY_STATUS.APPROVED) {
    return sendError(res, { message: 'Only a live product can be featured', statusCode: HTTP_STATUS.CONFLICT })
  }
  a.isFeatured = req.body.isFeatured === undefined ? !a.isFeatured : Boolean(req.body.isFeatured)
  await a.save()
  return sendSuccess(res, { message: a.isFeatured ? 'Featured' : 'Removed from featured', data: { product: a } })
})

export const deleteProduct = asyncHandler(async (req, res) => {
  const a = await Accessory.findById(req.params.id)
  if (!a) return sendError(res, { message: 'Product not found', statusCode: HTTP_STATUS.NOT_FOUND })
  await Promise.all([a.deleteOne(), AccessoryInquiry.deleteMany({ accessoryId: a._id })])
  sendToUser(a.sellerId, {
    title: 'Product removed',
    body: `${a.name} was removed by the CarCommunity team.`,
    type: 'ACCESSORY_REMOVED',
    data: { link: '/app/accessories/mine' },
  })
  return sendSuccess(res, { message: 'Product deleted' })
})

export const listInquiries = asyncHandler(async (req, res) => {
  const filter = {}
  const status = str(req.query.status).toUpperCase()
  if (['NEW', 'CONTACTED', 'CLOSED'].includes(status)) filter.status = status
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const [items, total] = await Promise.all([
    AccessoryInquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('accessoryId', 'name images price status')
      .populate('sellerId', 'fullName phone')
      .lean(),
    AccessoryInquiry.countDocuments(filter),
  ])
  return sendSuccess(res, {
    data: {
      inquiries: items.map((i) => ({
        _id: i._id,
        product: i.accessoryId
          ? { _id: i.accessoryId._id, name: i.accessoryId.name, price: i.accessoryId.price, image: i.accessoryId.images?.[0] || '' }
          : null,
        seller: i.sellerId ? { name: i.sellerId.fullName, phone: i.sellerId.phone } : null,
        buyerName: i.buyerName,
        buyerPhone: i.buyerPhone,
        quantity: i.quantity,
        message: i.message,
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

export const setInquiryStatus = asyncHandler(async (req, res) => {
  const status = str(req.body.status).toUpperCase()
  if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
    return sendError(res, { message: 'Invalid status', statusCode: HTTP_STATUS.BAD_REQUEST })
  }
  const inq = await AccessoryInquiry.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true })
  if (!inq) return sendError(res, { message: 'Enquiry not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Enquiry updated', data: { inquiry: inq } })
})

// ---- categories ----

export const listCategories = asyncHandler(async (_req, res) => {
  await ensureAccessoryCategories()
  const [cats, counts] = await Promise.all([
    AccessoryCategory.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Accessory.aggregate([{ $group: { _id: '$categoryId', n: { $sum: 1 } } }]),
  ])
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]))
  return sendSuccess(res, { data: { categories: cats.map((c) => ({ ...c, productCount: byId[String(c._id)] || 0 })) } })
})

export const createCategory = asyncHandler(async (req, res) => {
  const name = str(req.body.name).slice(0, 60)
  if (!name) return sendError(res, { message: 'Category name is required', statusCode: HTTP_STATUS.BAD_REQUEST })
  const slug = slugify(name)
  if (await AccessoryCategory.exists({ slug })) {
    return sendError(res, { message: 'This category already exists', statusCode: HTTP_STATUS.CONFLICT })
  }
  const last = await AccessoryCategory.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean()
  const category = await AccessoryCategory.create({ name, slug, sortOrder: (last?.sortOrder ?? -1) + 1 })
  return sendSuccess(res, { message: 'Category added', data: { category }, statusCode: HTTP_STATUS.CREATED })
})

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await AccessoryCategory.findById(req.params.id)
  if (!cat) return sendError(res, { message: 'Category not found', statusCode: HTTP_STATUS.NOT_FOUND })
  if (req.body.name !== undefined) {
    const name = str(req.body.name).slice(0, 60)
    if (!name) return sendError(res, { message: 'Category name is required', statusCode: HTTP_STATUS.BAD_REQUEST })
    const slug = slugify(name)
    if (slug !== cat.slug && (await AccessoryCategory.exists({ slug }))) {
      return sendError(res, { message: 'Another category already uses this name', statusCode: HTTP_STATUS.CONFLICT })
    }
    cat.name = name
    cat.slug = slug
  }
  if (req.body.isActive !== undefined) cat.isActive = Boolean(req.body.isActive)
  if (req.body.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))) cat.sortOrder = Number(req.body.sortOrder)
  await cat.save()
  return sendSuccess(res, { message: 'Category updated', data: { category: cat } })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  if (await Accessory.exists({ categoryId: req.params.id })) {
    return sendError(res, {
      message: 'Products use this category. Deactivate it instead of deleting.',
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }
  const cat = await AccessoryCategory.findByIdAndDelete(req.params.id)
  if (!cat) return sendError(res, { message: 'Category not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Category removed' })
})
