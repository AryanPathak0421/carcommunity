import { apiRequest } from './http.js'

/** Customer app: admin-managed sizes, steps, chips, payment methods and duration labels. */
export const serviceConfigApi = {
  get: () => apiRequest('/app-config/service-ui', { skipAuth: true }),
  adminGet: () => apiRequest('/admin/service-config'),
  adminSave: (payload) => apiRequest('/admin/service-config', { method: 'PUT', body: payload }),
}
