import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { USER_ROLES, KYC_STATUS } from '../constants/roles.js'
const labourProfileSchema = new mongoose.Schema(
  {
    kycStatus: {
      type: String,
      enum: Object.values(KYC_STATUS),
      default: KYC_STATUS.PENDING,
    },
    aadhaarMasked: String,
    panMasked: String,
    /** When mechanic submitted Aadhaar/PAN video KYC for admin review */
    kycSubmittedAt: Date,
    /** Cloudinary video URL for manual Aadhaar + PAN review */
    kycVideoUrl: { type: String, maxlength: 2048 },
    kycVideoMeta: {
      publicId: { type: String, maxlength: 512 },
      resourceType: { type: String, maxlength: 32 },
      format: { type: String, maxlength: 32 },
      bytes: Number,
      duration: Number,
      uploadedAt: Date,
    },
    /** Cloudinary HTTPS URLs (preferred) */
    kycFrontImageUrl: { type: String, maxlength: 2048 },
    kycBackImageUrl: { type: String, maxlength: 2048 },
    /** Legacy base64 data URLs — kept for older submissions */
    kycFrontImageDataUrl: { type: String },
    kycBackImageDataUrl: { type: String },
    kycReviewNote: { type: String, trim: true, maxlength: 500 },
    /** Driving licence (number kept masked, like Aadhaar / PAN) */
    dlNumberMasked: String,
    dlExpiry: Date,
    /** Uploaded document photos for admin review — hidden from API output unless includeLabourKycImages */
    kycDocs: {
      aadhaarFrontUrl: { type: String, maxlength: 2048 },
      aadhaarBackUrl: { type: String, maxlength: 2048 },
      panImageUrl: { type: String, maxlength: 2048 },
      dlFrontUrl: { type: String, maxlength: 2048 },
      dlBackUrl: { type: String, maxlength: 2048 },
      selfieUrl: { type: String, maxlength: 2048 },
    },
    /** Work details collected during mechanic onboarding */
    onboarding: {
      experienceYears: { type: Number, min: 0, max: 60 },
      workshopName: { type: String, trim: true, maxlength: 120 },
      serviceCity: { type: String, trim: true, maxlength: 80 },
      servicePincode: { type: String, trim: true, maxlength: 6 },
      serviceAddress: { type: String, trim: true, maxlength: 300 },
      emergencyContactName: { type: String, trim: true, maxlength: 80 },
      emergencyContactPhone: { type: String, trim: true, maxlength: 10 },
      ownVehicleType: { type: String, enum: ['none', 'bike', 'car'] },
      ownVehicleRegNo: { type: String, trim: true, maxlength: 16 },
      submittedAt: Date,
    },
    /** @deprecated prefer categoryIds — kept for backward compatibility */
    skills: [{ type: String, trim: true }],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabourCategory' }],
    subcategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabourSubcategory' }],
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabourService' }],
    servicePricing: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourService' },
        subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourSubcategory' },
        minPrice: { type: Number, min: 0 },
        maxPrice: { type: Number, min: 0 },
      }
    ],
    minAcceptedPrice: { type: Number, min: 0 },
    maxAcceptedPrice: { type: Number, min: 0 },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available',
    },
    schedule: {
      type: [
        {
          day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
          startTime: { type: String, default: '09:00' },
          endTime: { type: String, default: '17:00' },
          isAvailable: { type: Boolean, default: true }
        }
      ],
      default: [
        { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Saturday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        { day: 'Sunday', startTime: '09:00', endTime: '17:00', isAvailable: false },
      ]
    },
    currentLatitude: { type: Number },
    currentLongitude: { type: Number },
    lastLocationUpdatedAt: { type: Date },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 10,
      maxlength: 10,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
      index: true,
    },
    fullName: { type: String, trim: true },
    /** Optional profile photo (https URL); shown in app header when set */
    profileImageUrl: { type: String, maxlength: 2048 },
    isActive: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
    savedAddress: {
      text: { type: String, trim: true, maxlength: 500 },
      lat: Number,
      lng: Number
    },
    /**
     * Refer & Earn. `referralCode` is this user's own shareable code, assigned
     * lazily the first time they open the referral screen (or at signup).
     * `referredBy` is set once, at registration, and never changes.
     */
    referralCode: {
      type: String,
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    referredByCode: { type: String, uppercase: true, trim: true },
    /**
     * FCM device registration tokens for push notifications, stored separately per type:
     *  - fcmTokens.web → browser tokens (delivered with a `webpush` config)
     *  - fcmTokens.app → mobile app tokens, Android/iOS (delivered with `android` + `apns` configs)
     */
    fcmTokens: {
      type: new mongoose.Schema(
        {
          web: {
            type: [
              {
                token: { type: String, required: true },
                updatedAt: { type: Date, default: Date.now },
                _id: false,
              },
            ],
            default: [],
          },
          app: {
            type: [
              {
                token: { type: String, required: true },
                /** Device OS detail: 'android' | 'ios' */
                deviceOs: { type: String, trim: true, lowercase: true },
                updatedAt: { type: Date, default: Date.now },
                _id: false,
              },
            ],
            default: [],
          },
        },
        { _id: false },
      ),
      default: () => ({ web: [], app: [] }),
      select: false,
    },
    labourProfile: labourProfileSchema,
  },
  { timestamps: true },
)

userSchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false
  return bcrypt.compare(plain, this.passwordHash)
}

userSchema.methods.toSafeObject = function toSafeObject(options = {}) {
  const o = this.toObject({ virtuals: true })
  delete o.passwordHash
  if (!options.includeLabourKycImages && o.labourProfile) {
    const lp = { ...o.labourProfile }
    // Tell the mechanic which documents are already uploaded without exposing the image URLs.
    const docs = lp.kycDocs || {}
    lp.kycDocsUploaded = Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, Boolean(v)]))
    delete lp.kycDocs
    delete lp.kycFrontImageDataUrl
    delete lp.kycBackImageDataUrl
    delete lp.kycFrontImageUrl
    delete lp.kycBackImageUrl
    o.labourProfile = lp
  }
  return o
}

export const User = mongoose.model('User', userSchema)
