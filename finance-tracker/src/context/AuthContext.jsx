import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../api/auth';

export const AuthContext = createContext(null);

// ── Helpers ────────────────────────────────────────────────────────────────
const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('finance_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const getSavedToken = () => localStorage.getItem('finance_token') || null;

// ── Provider ───────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [token, setToken]             = useState(getSavedToken);
  const [isVerifying, setIsVerifying] = useState(!!getSavedToken()); // true while verifying stored token

  // ── On mount: verify the stored token is still valid ─────────────────
  useEffect(() => {
    const storedToken = getSavedToken();
    if (!storedToken) { setIsVerifying(false); return; }

    getMe()
      .then(({ user }) => {
        setCurrentUser(user);
        setIsVerifying(false);
      })
      .catch(() => {
        // Token invalid or expired — clear everything
        _clearAuth();
        setIsVerifying(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Internal helper ───────────────────────────────────────────────────
  const _setAuth = (user, jwtToken) => {
    setCurrentUser(user);
    setToken(jwtToken);
    localStorage.setItem('finance_user',  JSON.stringify(user));
    localStorage.setItem('finance_token', jwtToken);
  };

  const _clearAuth = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('finance_user');
    localStorage.removeItem('finance_token');
  };

  // ── Public actions ────────────────────────────────────────────────────
  const login = async (username, password) => {
    const data = await loginUser({ username, password });
    _setAuth(data.user, data.token);
    return data;
  };

  const register = async (username, email, password) => {
    const data = await registerUser({ username, email, password });
    _setAuth(data.user, data.token);
    return data;
  };

  const logout = () => _clearAuth();

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      isLoggedIn:  !!currentUser,
      isVerifying, // app shows a spinner while we check token validity
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
