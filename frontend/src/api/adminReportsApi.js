import { apiRequest } from './http.js';

export const getDashboardStats = async () => {
  return apiRequest('/admin/reports/stats', { method: 'GET' });
};
