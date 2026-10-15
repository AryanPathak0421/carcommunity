import mongoose from 'mongoose'

/** A car brand with its models and (optionally) variants. Managed by admins. */
const carMakeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    models: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true, trim: true, maxlength: 60 },
            variants: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const CarMake = mongoose.model('CarMake', carMakeSchema)

const optionItem = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

/** Single document: the dropdown values shown in the sell form and the buy filters. */
const carOptionsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    fuelTypes: { type: [optionItem], default: [] },
    transmissions: { type: [optionItem], default: [] },
    cities: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
    ownerOptions: { type: [{ type: Number, min: 1, max: 10 }], default: [1, 2, 3, 4, 5] },
    maxPhotos: { type: Number, default: 8, min: 1, max: 15 },
  },
  { timestamps: true },
)

export const CarOptions = mongoose.model('CarOptions', carOptionsSchema)
