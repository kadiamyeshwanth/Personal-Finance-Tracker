import apiClient from './client';

export const fetchPersonality        = () => apiClient.get('/insights/personality').then(r => r.data);
export const fetchPredictions        = () => apiClient.get('/insights/predictions').then(r => r.data);
export const fetchSpendingPatterns   = () => apiClient.get('/insights/spending-patterns').then(r => r.data);
export const fetchHeatmap            = () => apiClient.get('/insights/heatmap').then(r => r.data);
export const fetchRecurringSuggestions = () => apiClient.get('/insights/recurring-suggestions').then(r => r.data);
export const suggestCategory         = (merchant, description) =>
  apiClient.post('/insights/suggest-category', { merchant, description }).then(r => r.data);
