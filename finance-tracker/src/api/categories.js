import apiClient from './client';

export const fetchCategories    = () => apiClient.get('/categories').then(r => r.data);
export const createCategory     = (data) => apiClient.post('/categories', data).then(r => r.data);
export const updateCategory     = (id, data) => apiClient.patch(`/categories/${id}`, data).then(r => r.data);
export const deleteCategory     = (id) => apiClient.delete(`/categories/${id}`).then(r => r.data);
