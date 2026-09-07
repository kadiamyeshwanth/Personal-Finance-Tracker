import apiClient from './client';

// `memory` is the entity set Mira resolved on the previous turn (category,
// merchant, period). Sending it back is what lets a follow-up like
// "what about August?" inherit the subject of the question before it.
export const sendChatMessage = (message, memory) =>
  apiClient.post('/ai/chat', { message, memory }).then(r => r.data);
export const getRoast             = () => apiClient.post('/ai/roast').then(r => r.data);
export const getInvestmentAdvice  = () => apiClient.get('/ai/investment-advice').then(r => r.data);
