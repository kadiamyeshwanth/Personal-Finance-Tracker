// Separate file for the useAuth hook — required for Vite Fast Refresh
// (Fast Refresh requires hook files to only export hooks, not context providers)
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default useAuth;
