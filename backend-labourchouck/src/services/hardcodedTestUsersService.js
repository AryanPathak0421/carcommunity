import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { USER_ROLES, KYC_STATUS } from '../constants/roles.js'
import { getTestAccount, listTestAccountPhones } from '../utils/phone.js'
import { LabourCategory } from '../models/LabourCategory.js'

/**
 * Ensures admin account exists in MongoDB.
 */
export async function ensureAdminUser() {
  // In production the admin is only (re)seeded when a password is configured, so the public
  // default 'ChangeMe@123' can never become the live admin password.
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
    console.warn('[HardcodedAuth] Skipping admin seed in production: set SEED_ADMIN_PASSWORD to enable it')
    return
  }
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@labourchowck.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123'
  const phone = process.env.SEED_ADMIN_PHONE || '8999999999'

  const passwordHash = await bcrypt.hash(password, 10)
  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        role: USER_ROLES.ADMIN,
        fullName: 'System Admin',
        phone,
        isPhoneVerified: true,
        isActive: true,
      },
    },
    { upsert: true, new: true },
  )
}

/**
 * Ensures a single hardcoded test user exists in MongoDB.
 */
export async function ensureHardcodedTestUser(phone) {
  const config = getTestAccount(phone)
  if (!config) return null

  let user = await User.findOne({ phone })
  if (!user) {
    const doc = {
      phone,
      role: config.role,
      fullName: config.fullName,
      isPhoneVerified: true,
      isActive: true,
      lastLoginAt: new Date(),
    }

    if (config.role === USER_ROLES.MECHANIC) {
      // Find a category to assign if any exists
      const cat = await LabourCategory.findOne({ isActive: true }).select('_id').lean()
      doc.labourProfile = {
        kycStatus: KYC_STATUS.VERIFIED,
        categoryIds: cat ? [cat._id] : [],
        availabilityStatus: 'available',
      }
    }

    user = await User.create(doc)
    console.info(`[HardcodedAuth] Created test user ${config.role} (phone=${phone})`)
  } else {
    // Ensure role and active status are preserved
    let changed = false
    if (user.role !== config.role) {
      user.role = config.role
      changed = true
    }
    if (!user.isActive) {
      user.isActive = true
      changed = true
    }
    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true
      changed = true
    }

    if (config.role === USER_ROLES.MECHANIC && user.labourProfile?.kycStatus !== KYC_STATUS.VERIFIED) {
      if (!user.labourProfile) user.labourProfile = {}
      user.labourProfile.kycStatus = KYC_STATUS.VERIFIED
      changed = true
    }

    if (changed) {
      await user.save()
      console.info(`[HardcodedAuth] Updated test user ${config.role} (phone=${phone})`)
    }
  }

  return user
}

/**
 * Seeds or validates all hardcoded test accounts on server boot.
 */
export async function ensureAllHardcodedTestUsers() {
  try {
    const phones = listTestAccountPhones()
    if (phones.length > 0) {
      for (const phone of phones) {
        await ensureHardcodedTestUser(phone)
      }
    }
    await ensureAdminUser()
    console.info('[HardcodedAuth] All hardcoded test accounts ready (1111111111 individual, 2222222222 mechanic, admin@labourchowck.local)')
  } catch (err) {
    console.error('[HardcodedAuth] Error seeding test accounts:', err.message)
  }
}

