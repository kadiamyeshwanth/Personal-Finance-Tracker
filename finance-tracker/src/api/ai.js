import apiClient from './client';

export const sendChatMessage      = (message) => apiClient.post('/ai/chat', { message }).then(r => r.data);
export const getRoast             = () => apiClient.post('/ai/roast').then(r => r.data);
export const getInvestmentAdvice  = () => apiClient.get('/ai/investment-advice').then(r => r.data);
