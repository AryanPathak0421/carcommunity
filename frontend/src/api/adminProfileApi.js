import { apiRequest } from './http.js';

export const getAdminProfile = async () => {
  return apiRequest('/admin/profile');
};

export const updateAdminProfile = async (payload) => {
  return apiRequest('/admin/profile', {
    method: 'PATCH',
    body: payload,
  });
};

export const changeAdminPassword = async (payload) => {
  return apiRequest('/admin/profile/password', {
    method: 'PATCH',
    body: payload,
  });
};
