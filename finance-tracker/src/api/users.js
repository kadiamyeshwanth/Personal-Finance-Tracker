import apiClient from './client';

// ── Get user stats (for Settings page) ──────────────────────────────────────
export const getUserStats = async () => {
  const { data } = await apiClient.get('/users/stats');
  return data;
};

// ── Update profile (username) ────────────────────────────────────────────────
export const updateProfile = async (payload) => {
  const { data } = await apiClient.patch('/users/profile', payload);
  return data;
};

// ── Change password ──────────────────────────────────────────────────────────
export const changePassword = async (payload) => {
  const { data } = await apiClient.patch('/users/password', payload);
  return data;
};

// ── Delete entire account + all data ────────────────────────────────────────
export const deleteAccount = async () => {
  const { data } = await apiClient.delete('/users/account');
  return data;
};

// ── Clear all data (keep account) ───────────────────────────────────────────
export const clearAllData = async () => {
  const { data } = await apiClient.delete('/users/data');
  return data;
};
