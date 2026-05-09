import apiClient from './client';

export const fetchSubscriptions = async () => {
  const { data } = await apiClient.get('/subscriptions');
  return data; // { data: [], monthlyTotal, yearlyTotal }
};

export const addSubscription = async (payload) => {
  const { data } = await apiClient.post('/subscriptions', payload);
  return data;
};

export const updateSubscription = async ({ id, ...payload }) => {
  const { data } = await apiClient.patch(`/subscriptions/${id}`, payload);
  return data;
};

export const deleteSubscription = async (id) => {
  const { data } = await apiClient.delete(`/subscriptions/${id}`);
  return data;
};
