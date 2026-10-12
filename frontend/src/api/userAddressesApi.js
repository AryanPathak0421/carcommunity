import { apiRequest } from './http.js'

export const userAddressesApi = {
  list: () => apiRequest('/users/me/addresses', { method: 'GET' }),
  create: (body) => apiRequest('/users/me/addresses', { method: 'POST', body }),
  update: (id, body) => apiRequest(`/users/me/addresses/${id}`, { method: 'PATCH', body }),
  remove: (id) => apiRequest(`/users/me/addresses/${id}`, { method: 'DELETE' }),
}
