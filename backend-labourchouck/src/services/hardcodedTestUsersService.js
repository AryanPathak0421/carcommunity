import { User } from '../models/User.js'
import { USER_ROLES, KYC_STATUS } from '../constants/roles.js'
import { getTestAccount, listTestAccountPhones } from '../utils/phone.js'
import { LabourCategory } from '../models/LabourCategory.js'

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
    if (phones.length === 0) return
    for (const phone of phones) {
      await ensureHardcodedTestUser(phone)
    }
    console.info('[HardcodedAuth] All hardcoded test accounts ready (1111111111 individual, 2222222222 mechanic)')
  } catch (err) {
    console.error('[HardcodedAuth] Error seeding test accounts:', err.message)
  }
}
