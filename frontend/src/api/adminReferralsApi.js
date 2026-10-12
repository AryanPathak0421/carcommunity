import { apiRequest } from './http.js'

export const adminReferralsApi = {
  /** @param {{ status?: string, page?: number, limit?: number }} [params] */
  list: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return apiRequest(`/admin/referrals${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  reject: (id, note = '') =>
    apiRequest(`/admin/referrals/${id}/reject`, { method: 'PATCH', body: { note } }),
}
