import { apiRequest } from './http.js'

export const walletsApi = {
  getMyWallet: () => {
    return apiRequest('/wallets/me', { method: 'GET' })
  },

  /** Ledger rows for the signed-in user, newest first. */
  getTransactions: (params = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return apiRequest(`/wallets/transactions${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },
}
