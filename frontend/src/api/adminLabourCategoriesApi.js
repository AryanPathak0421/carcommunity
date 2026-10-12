import { apiRequest } from './http.js'

export function fetchAdminLabourCategoryTree() {
  return apiRequest('/admin/labour-categories/tree')
}

export function createAdminLabourCategory(payload) {
  return apiRequest('/admin/labour-categories', { method: 'POST', body: payload })
}

export function patchAdminLabourCategory(id, payload) {
  return apiRequest(`/admin/labour-categories/${id}`, { method: 'PATCH', body: payload })
}

export function fetchAdminLabourCategoryById(id) {
  return apiRequest(`/admin/labour-categories/${id}`)
}

export function putAdminLabourCategory(id, payload) {
  return apiRequest(`/admin/labour-categories/${id}`, { method: 'PUT', body: payload })
}

export function updateAdminLabourCategoryGst(id, payload) {
  return apiRequest(`/admin/labour-categories/${id}/gst`, { method: 'PUT', body: payload })
}

export function createAdminLabourCategoryGroup(payload) {
  return apiRequest('/admin/labour-category-groups', { method: 'POST', body: payload })
}

export function patchAdminLabourCategoryGroup(id, payload) {
  return apiRequest(`/admin/labour-category-groups/${id}`, { method: 'PATCH', body: payload })
}
export function getAdminLabourCategoryById(id) {
  return apiRequest(`/admin/labour-categories/${id}`, { method: 'GET' })
}

export function getAdminLabourSubcategoryById(id) {
  return apiRequest(`/admin/labour-subcategories/${id}`, { method: 'GET' })
}

export function getAdminLabourServiceById(id) {
  return apiRequest(`/admin/labour-services/${id}`, { method: 'GET' })
}


export function createAdminLabourSubcategory(payload) {
  return apiRequest('/admin/labour-subcategories', { method: 'POST', body: payload })
}

export function updateAdminLabourSubcategory(id, payload) {
  return apiRequest(`/admin/labour-subcategories/${id}`, { method: 'PATCH', body: payload })
}

export function deleteAdminLabourCategory(id) {
  return apiRequest(`/admin/labour-categories/${id}`, { method: 'DELETE' })
}

export function deleteAdminLabourSubcategory(id) {
  return apiRequest(`/admin/labour-subcategories/${id}`, { method: 'DELETE' })
}

export function createAdminLabourService(payload) {
  return apiRequest('/admin/labour-services', { method: 'POST', body: payload })
}

export function updateAdminLabourService(id, payload) {
  return apiRequest(`/admin/labour-services/${id}`, { method: 'PATCH', body: payload })
}

export function deleteAdminLabourService(id) {
  return apiRequest(`/admin/labour-services/${id}`, { method: 'DELETE' })
}
