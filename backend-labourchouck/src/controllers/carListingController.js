import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/apiResponse.js'
import { isAllowedStoredMediaUrl } from '../utils/mediaUrl.js'
import { sendToUser, notifyAdmins } from '../services/notificationService.js'
import { User } from '../models/User.js'
import { CarListing, CarInquiry, CAR_LISTING_STATUS } from '../models/CarListing.js'
import { getCarOptions, getPublicCatalog } from '../services/carCatalogService.js'

const PAGE_LIMIT_MAX = 50
const OPEN_LISTING_LIMIT = 10 // pending + approved listings per seller

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
const str = (v) => (v == null ? '' : String(v).trim())

/** What a buyer (or anonymous visitor) may see. Seller phone is never part of this. */
function publicListing(l, seller) {
  return {
    _id: l._id,
    title: l.title,
    make: l.make,
    model: l.model,
    variant: l.variant,
    year: l.year,
    fuelType: l.fuelType,
    transmission: l.transmission,
    kmDriven: l.kmDriven,
    owners: l.owners,
    price: l.price,
    negotiable: l.negotiable,
    city: l.city,
    locationText: l.locationText,
    description: l.description,
    images: l.images,
    isFeatured: l.isFeatured,
    status: l.status,
    views: l.views,
    createdAt: l.createdAt,
    seller: seller ? { name: seller.fullName || 'Seller' } : undefined,
  }
}

function ownerListing(l) {
  return {
    ...publicListing(l),
    adminNote: l.adminNote,
    inquiryCount: l.inquiryCount,
    reviewedAt: l.reviewedAt,
    soldAt: l.soldAt,
    updatedAt: l.updatedAt,
  }
}

/** Validate + normalise the seller-editable fields. Returns { error } or { value }. */
function parseListingBody(body, { partial = false, options } = {}) {
  const MAX_IMAGES = options?.maxPhotos || 8
  const fuelValues = (options?.fuelTypes || []).filter((o) => o.isActive !== false).map((o) => o.value)
  const transmissionValues = (options?.transmissions || []).filter((o) => o.isActive !== false).map((o) => o.value)
  const out = {}
  const bad = (message) => ({ error: message })
  const has = (k) => body[k] !== undefined

  const text = (key, label, { max, required = false } = {}) => {
    if (!has(key)) return required && !partial ? `${label} is required` : null
    const v = str(body[key])
    if (required && !v) return `${label} is required`
    if (v.length > max) return `${label} is too long`
    out[key] = v
    return null
  }

  for (const err of [
    text('title', 'Title', { max: 120, required: true }),
    text('make', 'Make', { max: 60, required: true }),
    text('model', 'Model', { max: 60, required: true }),
    text('variant', 'Variant', { max: 80 }),
    text('city', 'City', { max: 80, required: true }),
    text('locationText', 'Location', { max: 240 }),
    text('description', 'Description', { max: 2000 }),
  ]) {
    if (err) return bad(err)
  }

  const intField = (key, label, min, max, required = true) => {
    if (!has(key)) return required && !partial ? `${label} is required` : null
    const n = num(body[key])
    if (n == null || !Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
      return `${label} must be a whole number between ${min} and ${max}`
    }
    out[key] = n
    return null
  }

  const year = new Date().getFullYear() + 1
  for (const err of [
    intField('year', 'Year', 1980, year),
    intField('kmDriven', 'Kilometres driven', 0, 2000000),
    intField('owners', 'Owners', 1, 10, false),
    intField('price', 'Price', 1000, 500000000),
  ]) {
    if (err) return bad(err)
  }

  if (has('fuelType') || !partial) {
    const v = str(body.fuelType).toUpperCase()
    if (!fuelValues.includes(v)) return bad(`Fuel type must be one of ${fuelValues.join(', ')}`)
    out.fuelType = v
  }
  if (has('transmission') || !partial) {
    const v = str(body.transmission).toUpperCase()
    if (!transmissionValues.includes(v)) return bad(`Transmission must be one of ${transmissionValues.join(', ')}`)
    out.transmission = v
  }
  if (has('negotiable')) out.negotiable = body.negotiable === true || body.negotiable === 'true'

  if (has('images')) {
    if (!Array.isArray(body.images)) return bad('images must be a list of URLs')
    const imgs = body.images.map(str).filter(Boolean)
    if (imgs.length > MAX_IMAGES) return bad(`You can add up to ${MAX_IMAGES} photos`)
    if (!imgs.every(isAllowedStoredMediaUrl)) return bad('One of the photo URLs is not allowed')
    out.images = imgs
  } else if (!partial) {
    out.images = []
  }
  if (!partial && (!out.images || out.images.length === 0)) return bad('Add at least one photo')
  if (partial && out.images && out.images.length === 0) return bad('Add at least one photo')

  return { value: out }
}

// ---------------------------------------------------------------------------
// Public browsing
// ---------------------------------------------------------------------------

export const listCars = asyncHandler(async (req, res) => {
  const q = req.query
  const filter = { status: CAR_LISTING_STATUS.APPROVED }

  const search = str(q.q)
  if (search) {
    const re = new RegExp(escapeRegex(search).slice(0, 60), 'i')
    filter.$or = [{ title: re }, { make: re }, { model: re }, { city: re }]
  }
  if (str(q.make)) filter.make = new RegExp(`^${escapeRegex(str(q.make)).slice(0, 60)}$`, 'i')
  if (str(q.city)) filter.city = new RegExp(`^${escapeRegex(str(q.city)).slice(0, 80)}$`, 'i')
  if (str(q.fuelType)) filter.fuelType = str(q.fuelType).toUpperCase()
  if (str(q.transmission)) filter.transmission = str(q.transmission).toUpperCase()

  const range = (field, min, max) => {
    const r = {}
    if (min != null && Number.isFinite(min)) r.$gte = min
    if (max != null && Number.isFinite(max)) r.$lte = max
    if (Object.keys(r).length) filter[field] = r
  }
  range('price', num(q.minPrice), num(q.maxPrice))
  range('year', num(q.minYear), num(q.maxYear))
  range('kmDriven', null, num(q.maxKm))

  const SORTS = {
    newest: { isFeatured: -1, createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    km_asc: { kmDriven: 1 },
    year_desc: { year: -1 },
  }
  const sort = SORTS[str(q.sort)] || SORTS.newest

  const page = Math.max(1, Number.parseInt(q.page, 10) || 1)
  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, Number.parseInt(q.limit, 10) || 12))

  const [items, total] = await Promise.all([
    CarListing.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sellerId', 'fullName')
      .lean(),
    CarListing.countDocuments(filter),
  ])

  return sendSuccess(res, {
    data: {
      listings: items.map((l) => publicListing(l, l.sellerId)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  })
})

/** Admin-managed catalogue: makes → models → variants, fuel types, transmissions, cities. */
export const getCatalog = asyncHandler(async (_req, res) => {
  return sendSuccess(res, { data: await getPublicCatalog() })
})

export const getCarFilters = asyncHandler(async (_req, res) => {
  const base = { status: CAR_LISTING_STATUS.APPROVED }
  const options = await getCarOptions()
  const [makes, cities, priceAgg] = await Promise.all([
    CarListing.distinct('make', base),
    CarListing.distinct('city', base),
    CarListing.aggregate([
      { $match: base },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ])
  return sendSuccess(res, {
    data: {
      makes: makes.sort(),
      cities: cities.sort(),
      fuelTypes: options.fuelTypes.filter((o) => o.isActive !== false).map(({ value, label }) => ({ value, label })),
      transmissions: options.transmissions.filter((o) => o.isActive !== false).map(({ value, label }) => ({ value, label })),
      price: priceAgg[0] ? { min: priceAgg[0].min, max: priceAgg[0].max } : { min: 0, max: 0 },
    },
  })
})

export const getCar = asyncHandler(async (req, res) => {
  const listing = await CarListing.findById(req.params.id).populate('sellerId', 'fullName')
  const viewerId = req.user?._id ? String(req.user._id) : null
  const sellerId = listing ? String(listing.sellerId?._id || listing.sellerId) : null
  const isOwner = viewerId && sellerId === viewerId
  const isAdmin = req.user?.role === 'admin'

  // Only approved/sold listings are public; the owner and admins also see pending/rejected ones.
  const visible =
    listing &&
    (isOwner || isAdmin || [CAR_LISTING_STATUS.APPROVED, CAR_LISTING_STATUS.SOLD].includes(listing.status))
  if (!visible) {
    return sendError(res, { message: 'Car listing not found', statusCode: HTTP_STATUS.NOT_FOUND })
  }

  if (!isOwner && listing.status === CAR_LISTING_STATUS.APPROVED) {
    CarListing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }).catch(() => {})
  }

  let myInquiry = null
  if (viewerId && !isOwner) {
    myInquiry = await CarInquiry.findOne({ listingId: listing._id, buyerId: viewerId })
      .select('status message offerPrice createdAt')
      .lean()
  }

  const base = isOwner || isAdmin ? ownerListing(listing) : publicListing(listing)
  return sendSuccess(res, {
    data: {
      listing: { ...base, seller: { name: listing.sellerId?.fullName || 'Seller' } },
      isOwner: Boolean(isOwner),
      myInquiry,
    },
  })
})

// ---------------------------------------------------------------------------
// Seller
// ---------------------------------------------------------------------------

export const createCar = asyncHandler(async (req, res) => {
  const parsed = parseListingBody(req.body, { options: await getCarOptions() })
  if (parsed.error) return sendError(res, { message: parsed.error, statusCode: HTTP_STATUS.BAD_REQUEST })

  const open = await CarListing.countDocuments({
    sellerId: req.user._id,
    status: { $in: [CAR_LISTING_STATUS.PENDING, CAR_LISTING_STATUS.APPROVED] },
  })
  if (open >= OPEN_LISTING_LIMIT) {
    return sendError(res, {
      message: `You can have up to ${OPEN_LISTING_LIMIT} active listings. Mark one as sold or remove it first.`,
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }

  const listing = await CarListing.create({
    ...parsed.value,
    sellerId: req.user._id,
    status: CAR_LISTING_STATUS.PENDING,
  })

  notifyAdmins({
    title: 'New car listing to review',
    body: `${listing.title} · ₹${listing.price.toLocaleString('en-IN')} · ${listing.city}`,
    type: 'CAR_LISTING_SUBMITTED',
    data: { listingId: String(listing._id), link: '/admin/cars' },
  })

  return sendSuccess(res, {
    message: 'Listing submitted for review',
    data: { listing: ownerListing(listing) },
    statusCode: HTTP_STATUS.CREATED,
  })
})

export const getMyCars = asyncHandler(async (req, res) => {
  const listings = await CarListing.find({ sellerId: req.user._id }).sort({ createdAt: -1 }).lean()
  return sendSuccess(res, { data: { listings: listings.map(ownerListing) } })
})

async function loadOwned(req, res) {
  const listing = await CarListing.findById(req.params.id)
  if (!listing || String(listing.sellerId) !== String(req.user._id)) {
    sendError(res, { message: 'Car listing not found', statusCode: HTTP_STATUS.NOT_FOUND })
    return null
  }
  return listing
}

export const updateCar = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req, res)
  if (!listing) return
  if (listing.status === CAR_LISTING_STATUS.SOLD) {
    return sendError(res, { message: 'A sold listing cannot be edited', statusCode: HTTP_STATUS.CONFLICT })
  }
  const parsed = parseListingBody(req.body, { partial: true, options: await getCarOptions() })
  if (parsed.error) return sendError(res, { message: parsed.error, statusCode: HTTP_STATUS.BAD_REQUEST })

  Object.assign(listing, parsed.value)
  // Any edit goes back through review so approved content cannot be swapped silently.
  listing.status = CAR_LISTING_STATUS.PENDING
  listing.adminNote = ''
  listing.isFeatured = false
  await listing.save()

  notifyAdmins({
    title: 'Car listing updated — review again',
    body: listing.title,
    type: 'CAR_LISTING_SUBMITTED',
    data: { listingId: String(listing._id), link: '/admin/cars' },
  })
  return sendSuccess(res, { message: 'Listing updated and sent for review', data: { listing: ownerListing(listing) } })
})

export const markCarSold = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req, res)
  if (!listing) return
  if (listing.status !== CAR_LISTING_STATUS.APPROVED) {
    return sendError(res, {
      message: 'Only a live listing can be marked as sold',
      statusCode: HTTP_STATUS.CONFLICT,
    })
  }
  listing.status = CAR_LISTING_STATUS.SOLD
  listing.soldAt = new Date()
  listing.isFeatured = false
  await listing.save()
  return sendSuccess(res, { message: 'Marked as sold', data: { listing: ownerListing(listing) } })
})

export const deleteCar = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req, res)
  if (!listing) return
  await Promise.all([listing.deleteOne(), CarInquiry.deleteMany({ listingId: listing._id })])
  return sendSuccess(res, { message: 'Listing removed' })
})

/** Inquiries received on the seller's listings. */
export const getReceivedInquiries = asyncHandler(async (req, res) => {
  const inquiries = await CarInquiry.find({ sellerId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('listingId', 'title images price status')
    .lean()
  return sendSuccess(res, {
    data: {
      inquiries: inquiries.map((i) => ({
        _id: i._id,
        listing: i.listingId
          ? { _id: i.listingId._id, title: i.listingId.title, image: i.listingId.images?.[0] || '', price: i.listingId.price }
          : null,
        buyerName: i.buyerName,
        buyerPhone: i.buyerPhone,
        message: i.message,
        offerPrice: i.offerPrice,
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
  const inquiry = await CarInquiry.findOneAndUpdate(
    { _id: req.params.inquiryId, sellerId: req.user._id },
    { $set: { status } },
    { new: true },
  )
  if (!inquiry) return sendError(res, { message: 'Inquiry not found', statusCode: HTTP_STATUS.NOT_FOUND })
  return sendSuccess(res, { message: 'Inquiry updated', data: { inquiry } })
})

// ---------------------------------------------------------------------------
// Buyer
// ---------------------------------------------------------------------------

export const createInquiry = asyncHandler(async (req, res) => {
  const listing = await CarListing.findById(req.params.id)
  if (!listing || listing.status !== CAR_LISTING_STATUS.APPROVED) {
    return sendError(res, { message: 'This car is no longer available', statusCode: HTTP_STATUS.NOT_FOUND })
  }
  if (String(listing.sellerId) === String(req.user._id)) {
    return sendError(res, { message: 'You cannot enquire about your own car', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const message = str(req.body.message).slice(0, 500)
  const offer = num(req.body.offerPrice)
  if (offer != null && (!Number.isFinite(offer) || offer < 0 || offer > 500000000)) {
    return sendError(res, { message: 'Invalid offer price', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  const buyer = await User.findById(req.user._id).select('fullName phone').lean()
  const phone = str(buyer?.phone)
  if (!phone) {
    return sendError(res, { message: 'Add a phone number to your profile first', statusCode: HTTP_STATUS.BAD_REQUEST })
  }

  let inquiry
  try {
    inquiry = await CarInquiry.create({
      listingId: listing._id,
      sellerId: listing.sellerId,
      buyerId: req.user._id,
      buyerName: buyer?.fullName || '',
      buyerPhone: phone,
      message,
      offerPrice: offer,
    })
  } catch (e) {
    if (e?.code === 11000) {
      return sendError(res, {
        message: 'You have already sent an enquiry for this car',
        statusCode: HTTP_STATUS.CONFLICT,
      })
    }
    throw e
  }
  await CarListing.updateOne({ _id: listing._id }, { $inc: { inquiryCount: 1 } })

  sendToUser(listing.sellerId, {
    title: 'New enquiry on your car',
    body: `${buyer?.fullName || 'A buyer'} is interested in ${listing.title}`,
    type: 'CAR_INQUIRY',
    data: { listingId: String(listing._id), inquiryId: String(inquiry._id), link: '/app/cars/enquiries' },
  })

  // Reveal the seller's number only to a buyer who has actually enquired.
  const seller = await User.findById(listing.sellerId).select('fullName phone').lean()
  return sendSuccess(res, {
    message: 'Enquiry sent to the seller',
    data: { inquiry: { _id: inquiry._id, status: inquiry.status }, seller: { name: seller?.fullName, phone: seller?.phone } },
    statusCode: HTTP_STATUS.CREATED,
  })
})

/** The seller's contact, only for buyers who already enquired (re-opened from "My enquiries"). */
export const getSellerContact = asyncHandler(async (req, res) => {
  const inquiry = await CarInquiry.findOne({ listingId: req.params.id, buyerId: req.user._id }).lean()
  if (!inquiry) {
    return sendError(res, { message: 'Send an enquiry to see the seller contact', statusCode: HTTP_STATUS.FORBIDDEN })
  }
  const listing = await CarListing.findById(req.params.id).select('sellerId').lean()
  const seller = listing ? await User.findById(listing.sellerId).select('fullName phone').lean() : null
  return sendSuccess(res, { data: { seller: { name: seller?.fullName, phone: seller?.phone } } })
})

export const getMyInquiries = asyncHandler(async (req, res) => {
  const inquiries = await CarInquiry.find({ buyerId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('listingId', 'title images price status city')
    .lean()
  return sendSuccess(res, {
    data: {
      inquiries: inquiries.map((i) => ({
        _id: i._id,
        listing: i.listingId
          ? {
              _id: i.listingId._id,
              title: i.listingId.title,
              image: i.listingId.images?.[0] || '',
              price: i.listingId.price,
              status: i.listingId.status,
              city: i.listingId.city,
            }
          : null,
        message: i.message,
        offerPrice: i.offerPrice,
        status: i.status,
        createdAt: i.createdAt,
      })),
    },
  })
})

export const isValidObjectId = (id) => mongoose.isValidObjectId(id)
