import { apiRequest } from './http.js'

/** PATCH /users/me — fullName, profileImageUrl, etc. */
export function patchCurrentUser(body) {
  return apiRequest('/users/me', { method: 'PATCH', body })
}

/** DELETE /users/me — delete account */
export function deleteCurrentUser() {
  return apiRequest('/users/me', { method: 'DELETE' })
}
