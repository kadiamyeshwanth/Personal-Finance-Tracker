import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, TrendingUp, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  let s = 0;
  if (password.length >= 6)  s++;
  if (password.length >= 10) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['', 'var(--red)', 'var(--yellow)', 'var(--yellow)', 'var(--green)', 'var(--green)'];
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= s ? colors[s] : 'var(--border)', transition: 'background 0.25s' }} />
        ))}
      </div>
      {s > 0 && <span style={{ fontSize: '11px', color: colors[s] }}>{labels[s]}</span>}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="n-label">{label}</label>
    {children}
  </div>
);

const LoginPage = () => {
  const { isLoggedIn, login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup]     = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  // Forgot-password states
  const [forgotMode, setForgotMode]         = useState(false);
  const [forgotEmail, setForgotEmail]       = useState('');
  const [forgotSent, setForgotSent]         = useState(false);
  const [forgotLoading, setForgotLoading]   = useState(false);
  const [forgotError, setForgotError]       = useState('');

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const upd = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); setError(''); };

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (isSignup) {
        if (!form.username || !form.email || !form.password || !form.confirm) { setError('All fields are required.'); return; }
        if (form.password.length < 6)              { setError('Password must be at least 6 characters.'); return; }
        if (form.password !== form.confirm)         { setError('Passwords do not match.'); return; }
        await register(form.username, form.email, form.password);
      } else {
        if (!form.username || !form.password)       { setError('Username and password are required.'); return; }
        await login(form.username, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => { setIsSignup(p => !p); setError(''); setForgotMode(false); setForgotSent(false); setForm({ username: '', email: '', password: '', confirm: '' }); };

  const submitForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setForgotError('Please enter your email.'); return; }
    setForgotLoading(true); setForgotError('');
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setForgotLoading(false);
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
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', width: '40px', height: '40px',
            borderRadius: '10px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-secondary)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: '18px',
          }}>
            <TrendingUp size={20} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />
          </div>
          <h1 style={{
            fontSize: '24px', fontWeight: 700,
            color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.2,
          }}>
            {isSignup ? 'Create your account' : 'Log in to Money Tracker'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '14px', marginTop: '6px' }}>
            {isSignup
              ? 'Start organizing your finances for free.'
              : 'Enter your details to continue.'}
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '24px',
          boxShadow: 'rgba(15,15,15,.04) 0 0 0 1px, rgba(15,15,15,.06) 0 2px 4px',
        }}>
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                background: 'var(--red-bg)', color: 'var(--red)',
                border: '1px solid rgba(196,85,77,0.18)',
                borderRadius: 'var(--r)', padding: '9px 12px',
                fontSize: '13px', marginBottom: '16px',
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Google OAuth Button */}
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '9px 16px', marginBottom: '16px',
              border: '1px solid var(--border-strong)', borderRadius: 'var(--r)',
              background: 'var(--bg)', color: 'var(--text)',
              fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
              textDecoration: 'none', cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
          >
            {/* Google SVG logo */}
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </a>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <Field label={isSignup ? 'Username' : 'Username or email'}>
              <input className="n-input" type="text" value={form.username} onChange={upd('username')}
                placeholder={isSignup ? 'e.g. yeshwanth' : 'Enter username or email'}
                autoComplete="username" autoFocus required
              />
            </Field>

            {isSignup && (
              <Field label="Email address">
                <input className="n-input" type="email" value={form.email} onChange={upd('email')}
                  placeholder="you@example.com" autoComplete="email" required
                />
              </Field>
            )}

            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input className="n-input" type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={upd('password')} placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  style={{ paddingRight: '38px' }} required
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {isSignup && <PasswordStrength password={form.password} />}
              {!isSignup && (
                <div style={{ textAlign: 'right', marginTop: '4px' }}>
                  <button type="button" onClick={() => { setForgotMode(p => !p); setForgotSent(false); setForgotError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '12px', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </Field>

            {isSignup && (
              <Field label="Confirm password">
                <input className="n-input" type="password" value={form.confirm} onChange={upd('confirm')}
                  placeholder="Re-enter password" autoComplete="new-password" required
                  style={{ borderColor: form.confirm && form.password !== form.confirm ? 'var(--red)' : undefined }}
                />
                {form.confirm && form.password !== form.confirm && (
                  <p style={{ color: 'var(--red)', fontSize: '11px', marginTop: '3px' }}>Passwords don't match</p>
                )}
              </Field>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.985 }}
              className="n-btn n-btn-primary n-btn-full"
              style={{ marginTop: '4px', padding: '10px', fontSize: '15px' }}
            >
              {loading
                ? <><Loader2 size={14} style={{ animation: 'n-spin 0.8s linear infinite' }} /> {isSignup ? 'Creating account…' : 'Signing in…'}</>
                : (isSignup ? 'Create account' : 'Continue')
              }
            </motion.button>
          </form>

          {/* Inline Forgot-Password panel */}
          <AnimatePresence>
            {forgotMode && !isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                  {forgotSent ? (
                    <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r)', padding: '12px', fontSize: '13px', color: 'var(--green)' }}>
                      ✓ Check your email (or the backend console) for a reset link.
                    </div>
                  ) : (
                    <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label className="n-label">Enter your account email</label>
                      {forgotError && <p style={{ color: 'var(--red)', fontSize: '12px', margin: 0 }}>{forgotError}</p>}
                      <input className="n-input" type="email" placeholder="you@example.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" disabled={forgotLoading} className="n-btn n-btn-primary n-btn-sm" style={{ flex: 1 }}>
                          {forgotLoading ? <><Loader2 size={12} style={{ animation: 'n-spin 0.8s linear infinite' }} /> Sending…</> : 'Send reset link'}
                        </button>
                        <button type="button" onClick={() => setForgotMode(false)} className="n-btn n-btn-default n-btn-sm">
                          <ArrowLeft size={12} /> Back
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button onClick={toggle} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontSize: '13px', fontWeight: 500, padding: 0,
            }}>
              {isSignup ? 'Log in' : 'Sign up for free'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', marginTop: '20px' }}>
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </motion.div>

      <style>{`@keyframes n-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoginPage;
