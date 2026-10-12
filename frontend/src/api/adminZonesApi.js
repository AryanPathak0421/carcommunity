import { apiRequest } from './http.js'

export const adminZonesApi = {
  getZoneSettings: () => apiRequest('/admin/zones/settings', { method: 'GET' }),
  updateZoneSettings: (payload) => apiRequest('/admin/zones/settings', { method: 'PUT', body: payload }),
  getZoneStatistics: () => apiRequest('/admin/zones/statistics', { method: 'GET' }),
}
