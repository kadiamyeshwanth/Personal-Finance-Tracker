import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye as Eye,
  EyeSlash as EyeOff,
  CircleNotch as Loader2,
  TrendUp as TrendingUp,
  CheckCircle as CheckCircle2,
  XCircle as XCircle,
} from '@phosphor-icons/react';
import apiClient from '../api/client';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  // Redirect if no token/email in URL
  useEffect(() => {
    if (!token || !email) navigate('/login', { replace: true });
  }, [token, email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await apiClient.post('/auth/reset-password', { token, email, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, ui-sans-serif, sans-serif', padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: '380px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', width: '40px', height: '40px',
            borderRadius: '10px', border: '1px solid var(--border-strong)',
            background: 'var(--bg-secondary)', alignItems: 'center',
            justifyContent: 'center', marginBottom: '18px',
          }}>
            <TrendingUp size={20} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
            Set a new password
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '14px', marginTop: '6px' }}>
            {email && `For ${decodeURIComponent(email)}`}
          </p>
        </div>

        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '24px',
          boxShadow: 'rgba(15,15,15,.04) 0 0 0 1px, rgba(15,15,15,.06) 0 2px 4px',
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--green)', marginBottom: '12px' }} strokeWidth={1.5} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                Password updated!
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                Redirecting you to login…
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && (
                <div style={{
                  background: 'var(--red-bg)', color: 'var(--red)',
                  border: '1px solid rgba(196,85,77,0.18)',
                  borderRadius: 'var(--r)', padding: '9px 12px', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <XCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className="n-label">New password</label>
                <div style={{ position: 'relative' }}>
                  <input className="n-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: '38px' }} required autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="n-label">Confirm password</label>
                <input className="n-input"
                  type="password" placeholder="Re-enter new password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  style={{ borderColor: confirm && password !== confirm ? 'var(--red)' : undefined }}
                  required
                />
                {confirm && password !== confirm && (
                  <p style={{ color: 'var(--red)', fontSize: '11px', marginTop: '3px' }}>Passwords don't match</p>
                )}
              </div>

              <motion.button
                type="submit" disabled={loading}
                whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.985 }}
                className="n-btn n-btn-primary n-btn-full"
                style={{ marginTop: '4px', padding: '10px', fontSize: '15px' }}
              >
                {loading
                  ? <><Loader2 size={14} style={{ animation: 'n-spin 0.8s linear infinite' }} /> Updating…</>
                  : 'Update password'}
              </motion.button>
            </form>
          )}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '14px', textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </motion.div>
      <style>{`@keyframes n-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ResetPasswordPage;
