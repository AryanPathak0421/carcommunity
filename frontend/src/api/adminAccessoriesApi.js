import { apiRequest } from './http.js'

const qs = (params = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const adminAccessoriesApi = {
  list: (params) => apiRequest(`/admin/accessories${qs(params)}`),
  review: (id, action, note = '') =>
    apiRequest(`/admin/accessories/${id}/review`, { method: 'PATCH', body: { action, note } }),
  setFeatured: (id, isFeatured) =>
    apiRequest(`/admin/accessories/${id}/featured`, { method: 'PATCH', body: { isFeatured } }),
  remove: (id) => apiRequest(`/admin/accessories/${id}`, { method: 'DELETE' }),
  inquiries: (params) => apiRequest(`/admin/accessories/inquiries${qs(params)}`),
  setInquiryStatus: (id, status) =>
    apiRequest(`/admin/accessories/inquiries/${id}`, { method: 'PATCH', body: { status } }),
  categories: () => apiRequest('/admin/accessories/categories'),
  createCategory: (name) => apiRequest('/admin/accessories/categories', { method: 'POST', body: { name } }),
  updateCategory: (id, payload) =>
    apiRequest(`/admin/accessories/categories/${id}`, { method: 'PATCH', body: payload }),
  deleteCategory: (id) => apiRequest(`/admin/accessories/categories/${id}`, { method: 'DELETE' }),
}
