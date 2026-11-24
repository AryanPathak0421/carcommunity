import { apiRequest } from './http.js'

/** Mechanic's Product Wallet (separate from the service wallet). */
export const productWalletApi = {
  getWallet: () => apiRequest('/product-wallet/me'),
  getTransactions: (params = {}) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return apiRequest(`/product-wallet/transactions${qs ? `?${qs}` : ''}`)
  },
  getWithdrawals: () => apiRequest('/product-wallet/withdrawals'),
  requestWithdrawal: (payload) => apiRequest('/product-wallet/withdrawals', { method: 'POST', body: payload }),
}
