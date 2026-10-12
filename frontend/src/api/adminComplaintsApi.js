import { apiRequest } from './http.js'

export const adminComplaintsApi = {
  /** GET /api/v1/admin/complaints?status=OPEN&page=1&limit=20 */
  getAllComplaints: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status && params.status !== 'ALL') q.set('status', params.status)
    if (params.role && params.role !== 'ALL') q.set('role', params.role)
    if (params.page) q.set('page', params.page)
    if (params.limit) q.set('limit', params.limit)
    const qs = q.toString()
    return apiRequest(`/admin/complaints${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  /** PATCH /api/v1/admin/complaints/:id */
  updateComplaint: (id, payload) =>
    apiRequest(`/admin/complaints/${id}`, { method: 'PATCH', body: payload }),
}
