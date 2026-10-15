import { apiRequest } from './http.js'
import { uploadMedia } from './uploadApi.js'

const qs = (params = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** Car accessories: mechanics list products, admin approves, customers browse and send order requests. */
export const accessoriesApi = {
  // public / customer
  list: (params) => apiRequest(`/accessories${qs(params)}`),
  categories: () => apiRequest('/accessories/categories'),
  get: (id) => apiRequest(`/accessories/${id}`),
  request: (id, payload) => apiRequest(`/accessories/${id}/inquiry`, { method: 'POST', body: payload }),
  sellerContact: (id) => apiRequest(`/accessories/${id}/seller-contact`),
  sentRequests: () => apiRequest('/accessories/inquiries/sent'),

  // mechanic (seller)
  mine: () => apiRequest('/accessories/mine'),
  create: (payload) => apiRequest('/accessories', { method: 'POST', body: payload }),
  update: (id, payload) => apiRequest(`/accessories/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => apiRequest(`/accessories/${id}`, { method: 'DELETE' }),
  leads: () => apiRequest('/accessories/inquiries/received'),
  setLeadStatus: (id, status) => apiRequest(`/accessories/inquiries/${id}`, { method: 'PATCH', body: { status } }),
}

export async function uploadAccessoryPhoto(file) {
  const res = await uploadMedia(file, 'accessories')
  const url = res?.data?.asset?.url
  if (!url) throw new Error('Upload failed. Please try again.')
  return url
}
