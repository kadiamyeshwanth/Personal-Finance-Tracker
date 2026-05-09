import apiClient from './client';

// ── Fetch all goals ─────────────────────────────────────────────────────────
export const fetchGoals = async () => {
  const { data } = await apiClient.get('/goals/');
  return data.map(g => ({ ...g, id: g._id }));
};

// ── Add a new goal ──────────────────────────────────────────────────────────
export const addGoal = async (payload) => {
  const { data } = await apiClient.post('/goals/add', payload);
  return data;
};

// ── Contribute / update a goal ──────────────────────────────────────────────
export const updateGoal = async ({ id, ...payload }) => {
  const { data } = await apiClient.post(`/goals/update/${id}`, payload);
  return data;
};

// ── Delete a goal ───────────────────────────────────────────────────────────
export const deleteGoal = async (id) => {
  const { data } = await apiClient.delete(`/goals/${id}`);
  return data;
};
