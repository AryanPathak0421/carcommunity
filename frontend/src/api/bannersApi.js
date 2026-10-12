import { apiRequest } from './http.js'

export function fetchActiveBanners() {
  return apiRequest(`/banners?_t=${Date.now()}`, { skipAuth: true })
}
