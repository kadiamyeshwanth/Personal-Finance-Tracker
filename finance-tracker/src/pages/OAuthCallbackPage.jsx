/**
 * OAuthCallbackPage — Handles the redirect from /api/auth/google/callback.
 *
 * The backend redirects to: /auth/callback?token=JWT_HERE
 * This page reads the token, stores it in localStorage (matching AuthContext),
 * then navigates to the dashboard.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token    = searchParams.get('token');
    const oauthErr = searchParams.get('error');

    if (oauthErr === 'oauth' || !token) {
      setError('Google sign-in failed. Please try again or use email/password.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    try {
      // Decode the JWT payload (base64) to get username/email for AuthContext
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Store token the same way AuthContext expects it
      localStorage.setItem('finance_token', token);
      localStorage.setItem('finance_user', JSON.stringify({
        id:       payload.id,
        username: payload.username,
        email:    payload.email,
      }));

      // Hard-navigate to force AuthContext to re-read localStorage
      window.location.href = '/dashboard';
    } catch {
      setError('Invalid token received. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
      fontFamily: 'Inter, ui-sans-serif, sans-serif',
    }}>
      {error ? (
        <>
          <XCircle size={36} style={{ color: 'var(--red)' }} strokeWidth={1.5} />
          <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '320px', textAlign: 'center' }}>{error}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Redirecting to login…</p>
        </>
      ) : (
        <>
          <div style={{ width: '22px', height: '22px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'n-spin 0.7s linear infinite' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-3)' }}>Signing you in…</p>
        </>
      )}
      <style>{`@keyframes n-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OAuthCallbackPage;
