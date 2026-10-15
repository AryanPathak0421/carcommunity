import { apiRequest } from './http.js'

const qs = (params = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const adminCarsApi = {
  list: (params) => apiRequest(`/admin/cars${qs(params)}`),
  review: (id, action, note = '') =>
    apiRequest(`/admin/cars/${id}/review`, { method: 'PATCH', body: { action, note } }),
  setFeatured: (id, isFeatured) =>
    apiRequest(`/admin/cars/${id}/featured`, { method: 'PATCH', body: { isFeatured } }),
  remove: (id) => apiRequest(`/admin/cars/${id}`, { method: 'DELETE' }),
  catalog: () => apiRequest('/admin/cars/catalog'),
  createMake: (payload) => apiRequest('/admin/cars/catalog/makes', { method: 'POST', body: payload }),
  updateMake: (id, payload) => apiRequest(`/admin/cars/catalog/makes/${id}`, { method: 'PATCH', body: payload }),
  deleteMake: (id) => apiRequest(`/admin/cars/catalog/makes/${id}`, { method: 'DELETE' }),
  saveOptions: (payload) => apiRequest('/admin/cars/catalog/options', { method: 'PUT', body: payload }),
  inquiries: (params) => apiRequest(`/admin/cars/inquiries${qs(params)}`),
  setInquiryStatus: (id, status) =>
    apiRequest(`/admin/cars/inquiries/${id}`, { method: 'PATCH', body: { status } }),
}
