import mongoose from 'mongoose'

export const CAR_LISTING_STATUS = Object.freeze({
  PENDING: 'PENDING', // waiting for admin review
  APPROVED: 'APPROVED', // visible to buyers
  REJECTED: 'REJECTED',
  SOLD: 'SOLD',
})

export const CAR_FUEL_TYPES = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'LPG']
export const CAR_TRANSMISSIONS = ['MANUAL', 'AUTOMATIC']

const carListingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    make: { type: String, required: true, trim: true, maxlength: 60, index: true },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    variant: { type: String, trim: true, maxlength: 80, default: '' },
    year: { type: Number, required: true, min: 1980, max: 2100, index: true },
    // allowed values are admin-configurable (CarOptions), validated in the controller
    fuelType: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, index: true },
    transmission: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    kmDriven: { type: Number, required: true, min: 0, max: 2000000 },
    owners: { type: Number, default: 1, min: 1, max: 10 },
    price: { type: Number, required: true, min: 1000, max: 500000000, index: true },
    negotiable: { type: Boolean, default: true },
    city: { type: String, required: true, trim: true, maxlength: 80, index: true },
    locationText: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    images: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(CAR_LISTING_STATUS),
      default: CAR_LISTING_STATUS.PENDING,
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isFeatured: { type: Boolean, default: false, index: true },
    soldAt: Date,
    views: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

carListingSchema.index({ status: 1, isFeatured: -1, createdAt: -1 })
carListingSchema.index({ title: 'text', make: 'text', model: 'text', city: 'text' })

export const CarListing = mongoose.model('CarListing', carListingSchema)

const carInquirySchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarListing', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerName: { type: String, trim: true, maxlength: 80, default: '' },
    buyerPhone: { type: String, trim: true, maxlength: 20, default: '' },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    offerPrice: { type: Number, min: 0, default: null },
    status: { type: String, enum: ['NEW', 'CONTACTED', 'CLOSED'], default: 'NEW', index: true },
  },
  { timestamps: true },
)

carInquirySchema.index({ listingId: 1, buyerId: 1 }, { unique: true })

export const CarInquiry = mongoose.model('CarInquiry', carInquirySchema)
