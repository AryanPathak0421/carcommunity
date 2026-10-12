import { apiRequest } from './http.js'

export const paymentsApi = {
  initPayment: (payload) => {
    return apiRequest('/payments/init', {
      method: 'POST',
      body: payload,
    })
  },

  verifyPayment: (payload) => {
    return apiRequest('/payments/verify', {
      method: 'POST',
      body: payload,
    })
  },
}
