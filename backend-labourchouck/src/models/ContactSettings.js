import mongoose from 'mongoose'

/** Single document behind the public "Contact us" page. Every field is edited from the admin panel. */
const linkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 30 },
    url: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
)

const contactSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    heading: { type: String, trim: true, maxlength: 60, default: 'Contact us' },
    intro: { type: String, trim: true, maxlength: 300, default: '' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    whatsapp: { type: String, trim: true, maxlength: 20, default: '' },
    email: { type: String, trim: true, maxlength: 120, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    mapUrl: { type: String, trim: true, maxlength: 300, default: '' },
    hours: { type: String, trim: true, maxlength: 120, default: '' },
    links: { type: [linkSchema], default: [] },
  },
  { timestamps: true },
)

export const ContactSettings = mongoose.model('ContactSettings', contactSettingsSchema)
