import { apiRequest } from './http.js'

export function fetchAdminBanners(panel) {
  const url = panel ? `/admin/banners?panel=${panel}` : '/admin/banners'
  return apiRequest(url)
}

export function createAdminBanner(formData) {
  // Use POST and FormData
  return apiRequest('/admin/banners', {
    method: 'POST',
    body: formData,
    headers: {
      // Do not set Content-Type to application/json, browser will set multipart boundary
    }
  })
}

export function updateAdminBanner(id, formData) {
  return apiRequest(`/admin/banners/${id}`, {
    method: 'PATCH',
    body: formData,
  })
}

export function deleteAdminBanner(id) {
  return apiRequest(`/admin/banners/${id}`, {
    method: 'DELETE',
  })
}
