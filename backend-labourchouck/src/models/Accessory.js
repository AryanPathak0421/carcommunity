import mongoose from 'mongoose'

export const ACCESSORY_STATUS = Object.freeze({
  PENDING: 'PENDING', // waiting for admin review
  APPROVED: 'APPROVED', // visible to customers
  REJECTED: 'REJECTED',
})

/** Admin-managed product categories (Seat covers, Floor mats, …). */
const accessoryCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)
export const AccessoryCategory = mongoose.model('AccessoryCategory', accessoryCategorySchema)

const accessorySchema = new mongoose.Schema(
  {
    /** The mechanic who lists the product. */
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessoryCategory', required: true, index: true },
    brand: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    price: { type: Number, required: true, min: 1, max: 10000000, index: true },
    mrp: { type: Number, min: 0, max: 10000000, default: null },
    stock: { type: Number, required: true, min: 0, max: 100000, default: 1 },
    condition: { type: String, enum: ['NEW', 'USED'], default: 'NEW' },
    /** Free text: "Maruti Swift, Hyundai i20" or "Universal". */
    compatibility: { type: String, trim: true, maxlength: 200, default: 'Universal' },
    warranty: { type: String, trim: true, maxlength: 80, default: '' },
    images: { type: [String], default: [] },

    status: { type: String, enum: Object.values(ACCESSORY_STATUS), default: ACCESSORY_STATUS.PENDING, index: true },
    adminNote: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isFeatured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

accessorySchema.index({ status: 1, isFeatured: -1, createdAt: -1 })

export const Accessory = mongoose.model('Accessory', accessorySchema)

const accessoryInquirySchema = new mongoose.Schema(
  {
    accessoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Accessory', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerName: { type: String, trim: true, maxlength: 80, default: '' },
    buyerPhone: { type: String, trim: true, maxlength: 20, default: '' },
    quantity: { type: Number, min: 1, max: 1000, default: 1 },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ['NEW', 'CONTACTED', 'CLOSED'], default: 'NEW', index: true },
  },
  { timestamps: true },
)
accessoryInquirySchema.index({ accessoryId: 1, buyerId: 1 }, { unique: true })

export const AccessoryInquiry = mongoose.model('AccessoryInquiry', accessoryInquirySchema)
