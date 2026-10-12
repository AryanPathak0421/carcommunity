import { apiRequest } from './http.js'

export const bookingsApi = {
  calculateBill: (payload) => {
    return apiRequest('/bookings/calculate', {
      method: 'POST',
      body: payload,
    })
  },

  createBooking: (payload) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: payload,
    })
  },

  getBookingStatus: (id) => {
    return apiRequest(`/bookings/${id}`, { method: 'GET' })
  },
  
  /** Last known mechanic position (used to resume the live map after a refresh). */
  getBookingLocation: (id) => {
    return apiRequest(`/bookings/${id}/location`, { method: 'GET' })
  },

  getMyBookings: () => {
    return apiRequest('/bookings/me', { method: 'GET' })
  },

  updateBookingStatus: (id, payload) => {
    return apiRequest(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: typeof payload === 'string' ? { status: payload } : payload,
    })
  },

  updatePaymentMethod: (id, paymentMethod) => {
    return apiRequest(`/bookings/${id}/payment-method`, {
      method: 'PATCH',
      body: { paymentMethod },
    })
  },

  verifyDailyOtp: (id, payload) => {
    return apiRequest(`/bookings/${id}/verify-daily-otp`, {
      method: 'PATCH',
      body: payload,
    })
  },
}
