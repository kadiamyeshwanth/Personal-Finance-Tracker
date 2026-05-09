import apiClient from './client';

// ── Fetch ALL transactions (no pagination) — for dashboard, reports, budgets ─
// Uses limit=0 to bypass pagination (returns all records)
export const fetchTransactions = async (params = {}) => {
  const searchParams = new URLSearchParams({ limit: 0, ...params });
  const { data } = await apiClient.get(`/transactions/?${searchParams}`);
  const records = data.data ?? data; // handle both paginated { data: [] } and legacy []
  return records.map(t => ({
    ...t,
    id: t._id,
    date: new Date(t.date).toISOString().split('T')[0],
  }));
};

// ── Fetch PAGINATED transactions — for the Transactions page ─────────────────
// Returns { data, total, page, pages, limit }
export const fetchTransactionsPaged = async ({ page = 1, limit = 25, ...filters } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (filters.type     && filters.type     !== 'all') params.set('type',     filters.type);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.search)   params.set('search',   filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo)   params.set('dateTo',   filters.dateTo);
  if (filters.sortField) params.set('sortField', filters.sortField);
  if (filters.sortDir)   params.set('sortDir',   filters.sortDir);

  const { data } = await apiClient.get(`/transactions/?${params}`);
  return {
    ...data,
    data: (data.data ?? []).map(t => ({
      ...t,
      id: t._id,
      date: new Date(t.date).toISOString().split('T')[0],
    })),
  };
};

// ── Add a new transaction ───────────────────────────────────────────────────
export const addTransaction = async (payload) => {
  const { data } = await apiClient.post('/transactions/add', payload);
  return data;
};

// ── Update an existing transaction ─────────────────────────────────────────
export const updateTransaction = async ({ id, ...payload }) => {
  const { data } = await apiClient.post(`/transactions/update/${id}`, payload);
  return data;
};

// ── Delete a transaction ────────────────────────────────────────────────────
export const deleteTransaction = async (id) => {
  const { data } = await apiClient.delete(`/transactions/${id}`);
  return data;
};
