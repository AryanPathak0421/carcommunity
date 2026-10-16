import { apiRequest } from './http.js'

const qs = (params = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const adminCarPartsApi = {
  list: (params) => apiRequest(`/admin/car-parts${qs(params)}`),
  create: (payload) => apiRequest('/admin/car-parts', { method: 'POST', body: payload }),
  update: (id, payload) => apiRequest(`/admin/car-parts/${id}`, { method: 'PATCH', body: payload }),
  /** Pass `{ delta: 5 }` to add / remove units atomically, or `{ stock: 40 }` to set an exact count. */
  adjustStock: (id, payload) => apiRequest(`/admin/car-parts/${id}/stock`, { method: 'PATCH', body: payload }),
  remove: (id) => apiRequest(`/admin/car-parts/${id}`, { method: 'DELETE' }),
}
