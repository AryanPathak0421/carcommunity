import { apiRequest } from './http.js'

/** Register this device's FCM token with the backend */
export function registerFcmToken(token, platform = 'web') {
  return apiRequest('/notifications/token', { method: 'POST', body: { token, platform } })
}

/** Remove this device's FCM token (call on logout) */
export function unregisterFcmToken(token) {
  return apiRequest('/notifications/token', { method: 'DELETE', body: { token } })
}

/** Paginated notification inbox with unread count */
export function getNotifications({ page = 1, limit = 20, unread } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (unread) params.set('unread', 'true')
  return apiRequest(`/notifications?${params}`)
}

export function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all', { method: 'PATCH' })
}

/** Ask the backend to send a test push to all of my registered devices */
export function sendTestNotification() {
  return apiRequest('/notifications/test', { method: 'POST' })
}
