import { apiRequest } from './http.js'

export function updateLabourStatus(availabilityStatus) {
  return apiRequest('/labour/location/status', { method: 'POST', body: { availabilityStatus } })
}

export function updateLabourLocation(latitude, longitude) {
  return apiRequest('/labour/location/update', { method: 'POST', body: { latitude, longitude } })
}
