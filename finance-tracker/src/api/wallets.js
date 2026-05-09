import apiClient from './client';

export const fetchWallets = async () => {
  const { data } = await apiClient.get('/wallets');
  return data; // { data: [], totalBalance }
};

export const addWallet = async (payload) => {
  const { data } = await apiClient.post('/wallets', payload);
  return data;
};

export const updateWallet = async ({ id, ...payload }) => {
  const { data } = await apiClient.patch(`/wallets/${id}`, payload);
  return data;
};

export const deleteWallet = async (id) => {
  const { data } = await apiClient.delete(`/wallets/${id}`);
  return data;
};
