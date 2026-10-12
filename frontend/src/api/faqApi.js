import { apiClient } from './http.js'

export const faqApi = {
  getFaqs: () => apiClient.get('/faqs'),
}
