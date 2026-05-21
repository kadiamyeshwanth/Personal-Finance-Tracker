import apiClient from './client';

export const fetchNotifications  = () => apiClient.get('/notifications').then(r => r.data);
export const markNotificationRead= (id) => apiClient.patch(`/notifications/${id}/read`).then(r => r.data);
export const markAllRead         = () => apiClient.post('/notifications/mark-all-read').then(r => r.data);
export const deleteNotification  = (id) => apiClient.delete(`/notifications/${id}`).then(r => r.data);
export const clearAllNotifications = () => apiClient.delete('/notifications').then(r => r.data);
