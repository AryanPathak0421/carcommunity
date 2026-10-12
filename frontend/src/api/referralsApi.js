import { apiRequest } from './http.js'

export const referralsApi = {
  /** The signed-in user's code, stats and referral list. */
  getMyReferrals: () => apiRequest('/referrals/me', { method: 'GET' }),

  /** Public check used on the signup screen before an OTP is spent. */
  validateCode: (code) =>
    apiRequest('/referrals/validate', { method: 'POST', body: { code }, skipAuth: true }),
}
