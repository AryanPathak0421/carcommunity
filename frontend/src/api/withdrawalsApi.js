import { apiRequest } from './http.js'

export const withdrawalsApi = {
  // GET
  getWithdrawals: () => {
    return apiRequest('/wallets/withdrawals', { method: 'GET' })
  },
  
  // POST
  createWithdrawal: (payload) => {
    return apiRequest('/wallets/withdraw', {
      method: 'POST',
      body: payload,
    })
  },
  
  // PUT
  updateWithdrawal: (id, payload) => {
    return apiRequest(`/wallets/withdrawals/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
  
  // PATCH
  patchWithdrawal: (id, payload) => {
    return apiRequest(`/wallets/withdrawals/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },
  
  // DELETE
  deleteWithdrawal: (id) => {
    return apiRequest(`/wallets/withdrawals/${id}`, { method: 'DELETE' })
  },
}
