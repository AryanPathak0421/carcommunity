import { apiRequest } from './http.js'

export const adminSettingsApi = {
  /** Public, non-sensitive settings (time slots, cash-dues limit). Safe for any signed-in or guest user. */
  getPublicSettings: () => {
    return apiRequest('/admin/settings/public', { method: 'GET', skipAuth: true })
  },

  getSettings: () => {
    return apiRequest('/admin/settings', { method: 'GET' })
  },

  getCommissionFeeAmounts: () => {
    return apiRequest('/admin/commission-fee', { method: 'GET' })
  },

  updatePlatformFees: (payload) => {
    return apiRequest('/admin/settings/platform-fees', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateCommission: (payload) => {
    return apiRequest('/admin/settings/commission', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateWalletLimit: (payload) => {
    return apiRequest('/admin/settings/wallet-limit', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateLabourCashLimit: (payload) => {
    return apiRequest('/admin/settings/labour-cash-limit', {
      method: 'PATCH',
      body: payload,
    })
  },



  updateGstPercentage: (payload) => {
    return apiRequest('/admin/settings/gst', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateCancellationPenalty: (payload) => {
    return apiRequest('/admin/settings/penalty', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateTimeSlots: (payload) => {
    return apiRequest('/admin/settings/time-slots', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateReferral: (payload) => {
    return apiRequest('/admin/settings/referral', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateUserSubscriptionToggle: (payload) => {
    return apiRequest('/admin/settings/user-subscription-toggle', {
      method: 'PATCH',
      body: payload,
    })
  },
}

// Public endpoint (no admin auth) — used in Checkout to fetch time slots
export const getPublicSettings = () => apiRequest('/admin/settings/public', { method: 'GET' })
