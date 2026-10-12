import { apiRequest } from './http'

export const adminSubscriptionsApi = {
  getPlans: () => apiRequest('/admin/subscriptions/plans'),
  
  createPlan: (data) => apiRequest('/admin/subscriptions/plans', {
    method: 'POST',
    body: data
  }),

  getPlanById: (id) => apiRequest(`/admin/subscriptions/plans/${id}`),

  updatePlan: (id, data) => apiRequest(`/admin/subscriptions/plans/${id}`, {
    method: 'PUT',
    body: data
  }),

  deletePlan: (id) => apiRequest(`/admin/subscriptions/plans/${id}`, {
    method: 'DELETE'
  }),

  getUserSubscriptions: () => apiRequest('/admin/subscriptions/users'),
}
