import apiClient from './client';

export const fetchJournal      = () => apiClient.get('/journal').then(r => r.data);
export const fetchJournalByDate= (date) => apiClient.get(`/journal/${date}`).then(r => r.data);
export const createJournalEntry= (data) => apiClient.post('/journal', data).then(r => r.data);
export const deleteJournalEntry= (id) => apiClient.delete(`/journal/${id}`).then(r => r.data);
