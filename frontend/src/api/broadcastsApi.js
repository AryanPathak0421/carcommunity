import { apiRequest } from './http.js'

export const broadcastsApi = {
  acceptBroadcast: (logId) => {
    return apiRequest(`/broadcasts/${logId}/accept`, { method: 'POST' })
  },

  /** Offers this mechanic can still accept (covers ones missed while the app was closed). */
  listOpenOffers: () => {
    return apiRequest('/broadcasts/offers/open', { method: 'GET' })
  },

  rejectBroadcast: (logId) => {
    return apiRequest(`/broadcasts/${logId}/reject`, { method: 'POST' })
  },
}
