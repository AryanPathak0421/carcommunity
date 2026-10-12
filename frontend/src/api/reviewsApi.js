import { apiRequest } from './http.js'

export const reviewsApi = {
  submitReview: (payload) => {
    return apiRequest('/reviews', {
      method: 'POST',
      body: payload,
    })
  },

  getUserReviews: (userId) => {
    return apiRequest(`/reviews/user/${userId}`, { method: 'GET' })
  },
  
  getAllReviews: () => {
    return apiRequest('/reviews', { method: 'GET' })
  },
}
