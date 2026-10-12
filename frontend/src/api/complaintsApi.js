import { apiRequest } from './http.js'

export const complaintsApi = {
  /** POST /api/v1/complaints — submit a new complaint */
  submitComplaint: (payload) =>
    apiRequest('/complaints', { method: 'POST', body: payload }),

  /** GET /api/v1/complaints/my — my past complaints */
  getMyComplaints: () =>
    apiRequest('/complaints/my', { method: 'GET' }),
}
