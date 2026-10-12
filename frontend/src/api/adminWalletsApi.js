import { apiRequest } from './http.js'

export const adminWalletsApi = {
  /**
   * Get all withdrawal requests for admin
   */
  getAllWithdrawals: () => {
    return apiRequest('/admin/wallets/withdrawals', { method: 'GET' })
  },

  /** Customer (individual) payout requests, with headline totals. */
  getUserWithdrawals: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return apiRequest(`/admin/wallets/user-withdrawals${qs}`, { method: 'GET' })
  },

  /**
   * Update withdrawal status (e.g. APPROVED or REJECTED)
   * @param {string} id - Withdrawal Request ID
   * @param {string} status - New status
   */
  updateWithdrawalStatus: (id, status, adminRemarks = '') => {
    return apiRequest(`/admin/wallets/withdrawals/${id}`, {
      method: 'PATCH',
      body: { status, adminRemarks },
    })
  }
}
