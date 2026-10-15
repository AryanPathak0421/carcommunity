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

/** Buy / sell used cars (customer app). Browsing is public; the rest needs a signed-in customer. */
export const carsApi = {
  list: (params) => apiRequest(`/cars${qs(params)}`),
  filters: () => apiRequest('/cars/filters'),
  /** Admin-managed makes / models / variants and dropdown options for the sell form. */
  catalog: () => apiRequest('/cars/catalog'),
  get: (id) => apiRequest(`/cars/${id}`),

  create: (payload) => apiRequest('/cars', { method: 'POST', body: payload }),
  update: (id, payload) => apiRequest(`/cars/${id}`, { method: 'PATCH', body: payload }),
  markSold: (id) => apiRequest(`/cars/${id}/sold`, { method: 'PATCH' }),
  remove: (id) => apiRequest(`/cars/${id}`, { method: 'DELETE' }),
  mine: () => apiRequest('/cars/mine'),

  enquire: (id, payload) => apiRequest(`/cars/${id}/inquiry`, { method: 'POST', body: payload }),
  sellerContact: (id) => apiRequest(`/cars/${id}/seller-contact`),
  received: () => apiRequest('/cars/inquiries/received'),
  sent: () => apiRequest('/cars/inquiries/sent'),
  setInquiryStatus: (inquiryId, status) =>
    apiRequest(`/cars/inquiries/${inquiryId}`, { method: 'PATCH', body: { status } }),
}

/** Upload one photo to the car-listings folder and return its URL. */
export async function uploadCarPhoto(file) {
  const res = await uploadMedia(file, 'car-listings')
  const url = res?.data?.asset?.url
  if (!url) throw new Error('Upload failed. Please try again.')
  return url
}
