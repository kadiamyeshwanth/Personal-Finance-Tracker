import apiClient from './client';

// ── Register a new user ─────────────────────────────────────────────────────
export const registerUser = async ({ username, email, password }) => {
  const { data } = await apiClient.post('/auth/register', { username, email, password });
  return data; // { message, token, user }
};

// ── Login an existing user ──────────────────────────────────────────────────
export const loginUser = async ({ username, password }) => {
  const { data } = await apiClient.post('/auth/login', { username, password });
  return data; // { message, token, user }
};

// ── Verify current token and get profile ───────────────────────────────────
export const getMe = async () => {
  const { data } = await apiClient.get('/auth/me');
  return data; // { user }
};
