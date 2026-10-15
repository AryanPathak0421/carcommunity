import mongoose from 'mongoose'

/**
 * Single document with the customer-app wording / options that used to be hard-coded:
 * car-wash sizes and steps, trust chips, payment methods and duration labels.
 */
const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 30 },
    hint: { type: String, trim: true, maxlength: 80, default: '' },
    icon: { type: String, enum: ['hatchback', 'sedan', 'suv', 'bike'], default: 'sedan' },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

const stepSchema = new mongoose.Schema(
  {
    icon: { type: String, enum: ['calendar', 'map', 'camera', 'check', 'clock', 'shield'], default: 'check' },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    text: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { _id: false },
)

const chipSchema = new mongoose.Schema(
  {
    icon: { type: String, enum: ['badge', 'zap', 'shield', 'clock', 'wallet'], default: 'badge' },
    label: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
)

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, enum: ['CASH', 'ONLINE'], required: true },
    label: { type: String, required: true, trim: true, maxlength: 30 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

const durationSchema = new mongoose.Schema(
  {
    id: { type: String, enum: ['few_hours', 'full_day', 'multi_day'], required: true },
    label: { type: String, required: true, trim: true, maxlength: 30 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

const serviceUiConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    carWash: {
      headline: { type: String, trim: true, maxlength: 60, default: 'Car Wash at your home' },
      tagline: { type: String, trim: true, maxlength: 80, default: 'Verified washers come to you' },
      sizes: { type: [sizeSchema], default: [] },
      steps: { type: [stepSchema], default: [] },
    },
    trustChips: { type: [chipSchema], default: [] },
    paymentMethods: { type: [paymentSchema], default: [] },
    durationOptions: { type: [durationSchema], default: [] },
  },
  { timestamps: true },
)

export const ServiceUiConfig = mongoose.model('ServiceUiConfig', serviceUiConfigSchema)
