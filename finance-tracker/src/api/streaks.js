import apiClient from './client';

export const fetchStreaks = () => apiClient.get('/streaks').then(r => r.data);
