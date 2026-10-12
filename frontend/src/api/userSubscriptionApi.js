import { apiRequest } from './http'

export const userSubscriptionApi = {
  getPlans: () => apiRequest('/user-subscriptions/plans'),
  getMySubscription: () => apiRequest('/user-subscriptions/my-subscription'),
  createOrder: (planId) => apiRequest('/user-subscriptions/order', {
    method: 'POST',
    body: { planId }
  }),
  verifyPayment: (data) => apiRequest('/user-subscriptions/verify', {
    method: 'POST',
    body: data
  })
}
