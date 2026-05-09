import apiClient from './client';

// ── Fetch all budgets ───────────────────────────────────────────────────────
export const fetchBudgets = async () => {
  const { data } = await apiClient.get('/budgets/');
  return data.map(b => ({ ...b, id: b._id }));
};

// ── Add / upsert a budget ───────────────────────────────────────────────────
export const saveBudget = async (payload) => {
  const { data } = await apiClient.post('/budgets/add', payload);
  return data;
};

// ── Delete a budget ─────────────────────────────────────────────────────────
export const deleteBudget = async (id) => {
  const { data } = await apiClient.delete(`/budgets/${id}`);
  return data;
};
