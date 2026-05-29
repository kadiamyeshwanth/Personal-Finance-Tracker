import apiClient from './client';

export const fetchWrapped = (month, year) =>
  apiClient.get(`/wrapped?month=${month}&year=${year}`).then(r => r.data);
