import mongoose from 'mongoose'

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    selfBalance: {
      type: Number,
      default: 0,
    },
    adminBalance: {
      type: Number,
      default: 0, // Amount owed to admin
    },
    /**
     * Product Wallet — kept completely separate from the service earnings
     * (selfBalance). Credited when a customer pays for this mechanic's accessory;
     * cashed out via its own PRODUCT withdrawal requests.
     */
    productBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export const Wallet = mongoose.model('Wallet', walletSchema)
