import apiClient from './client';

export const fetchMoods       = (limit = 90) => apiClient.get(`/mood?limit=${limit}`).then(r => r.data);
export const fetchMoodHistory  = (limit = 90) => apiClient.get(`/mood?limit=${limit}`).then(r => r.data);
export const logMood           = (data) => apiClient.post('/mood', data).then(r => r.data);
export const fetchCorrelation  = () => apiClient.get('/mood/correlation').then(r => r.data);
