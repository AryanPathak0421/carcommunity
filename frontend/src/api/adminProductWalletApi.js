import { apiRequest } from './http.js'

export const adminProductWalletApi = {
  listWithdrawals: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return apiRequest(`/admin/product-wallet/withdrawals${qs}`)
  },
  updateStatus: (id, status, adminRemarks = '') =>
    apiRequest(`/admin/product-wallet/withdrawals/${id}`, {
      method: 'PATCH',
      body: { status, adminRemarks },
    }),
}
