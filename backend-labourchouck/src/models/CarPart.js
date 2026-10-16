import mongoose from 'mongoose'

/**
 * A car part the platform stocks (brake pads, filters, batteries…). Customers can add parts to a
 * booking; the price is added to the booking total and `stock` is reserved until the booking ends.
 */
const carPartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, trim: true, maxlength: 60, default: '' },
    /** Manufacturer / shop part number, handy when matching a vehicle. */
    partNumber: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    price: { type: Number, required: true, min: 1, max: 1000000 },
    mrp: { type: Number, min: 0, max: 1000000, default: null },
    /** Units on the shelf right now (already net of units reserved by open bookings). */
    stock: { type: Number, required: true, min: 0, default: 0 },
    /**
     * Services this part is offered with. Empty = offered with every service.
     * Matched against the booking's service subcategory.
     */
    subcategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabourSubcategory' }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

carPartSchema.index({ name: 'text', brand: 'text', partNumber: 'text' })
carPartSchema.index({ subcategoryIds: 1, isActive: 1 })

export const CarPart = mongoose.model('CarPart', carPartSchema)
