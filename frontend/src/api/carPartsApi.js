import { apiRequest } from './http.js'

export const carPartsApi = {
  /** Parts offered with a service, each with its stock status. */
  listForService: (serviceId) => apiRequest(`/car-parts?serviceId=${encodeURIComponent(serviceId)}`),
}
