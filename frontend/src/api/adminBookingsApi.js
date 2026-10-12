import { apiRequest } from './http.js'

export const adminBookingsApi = {
  /**
   * Get all bookings with optional query parameters for pagination and filtering
   * @param {Object} params - Query parameters (e.g., { page, limit, status })
   */
  getAllBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    const url = query ? `/admin/bookings?${query}` : '/admin/bookings'
    return apiRequest(url, { method: 'GET' })
  },

  /**
   * Get booking details by ID
   * @param {string} id - Booking ID
   */
  getBookingById: (id) => {
    return apiRequest(`/admin/bookings/${id}`, { method: 'GET' })
  },

  /**
   * Update booking status forcefully (Admin)
   * @param {string} id - Booking ID
   * @param {string} status - New status
   */
  updateBookingStatus: (id, status) => {
    return apiRequest(`/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: { status },
    })
  },

  /**
   * Manually assign a labourer to a booking
   * @param {string} id - Booking ID
   * @param {string} laborId - Labourer's User ID
   */
  assignLabourer: (id, laborId) => {
    return apiRequest(`/admin/bookings/${id}/assign`, {
      method: 'PATCH',
      body: { laborId },
    })
  },

  /**
   * Delete booking by ID
   * @param {string} id - Booking ID
   */
  deleteBooking: (id) => {
    return apiRequest(`/admin/bookings/${id}`, { method: 'DELETE' })
  }
}
