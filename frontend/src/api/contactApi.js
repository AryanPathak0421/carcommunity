import { apiRequest } from './http.js'

const q = (audience) => (audience === 'mechanic' ? '?audience=mechanic' : '')

/** Contact us page: admin-managed phone, WhatsApp, email, address, hours and links (one set per app). */
export const contactApi = {
  get: (audience) => apiRequest(`/contact-info${q(audience)}`, { skipAuth: true }),
  adminGet: (audience) => apiRequest(`/admin/contact-settings${q(audience)}`),
  adminSave: (payload, audience) =>
    apiRequest(`/admin/contact-settings${q(audience)}`, { method: 'PUT', body: payload }),
}
