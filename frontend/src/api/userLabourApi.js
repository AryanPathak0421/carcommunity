import { apiRequest } from './http.js'

export function updateMyLabourCategories(services) {
  return apiRequest('/users/me/labour-categories', { method: 'PATCH', body: { services } })
}

export function updateLabourSchedule(schedule) {
  return apiRequest('/users/me/labour/schedule', { method: 'PATCH', body: { schedule } })
}
