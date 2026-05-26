import apiClient from './client';

export const fetchInvestments  = () => apiClient.get('/investments').then(r => r.data);
export const addInvestment     = (data) => apiClient.post('/investments', data).then(r => r.data);
export const updateInvestment  = (id, data) => apiClient.patch(`/investments/${id}`, data).then(r => r.data);
export const deleteInvestment  = (id) => apiClient.delete(`/investments/${id}`).then(r => r.data);
