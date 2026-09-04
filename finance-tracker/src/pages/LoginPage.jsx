import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye as Eye,
  EyeSlash as EyeOff,
  CircleNotch as Loader2,
  ArrowLeft as ArrowLeft,
  ShieldCheck as ShieldCheck,
  Bank as Landmark,
  Lightning as Zap,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { spring, springFast, stagger } from '../lib/motion';
import { LogoMark, LogoWordmark } from '../components/ui/Logo';
import ShaderBg, { AUTH_SHADER_DARK } from '../components/ui/shader-bg';

/* ── Password strength ─────────────────────────────────────────────────────
   Unchanged logic; the bar now animates its width with a spring instead of
   snapping, so the feedback tracks typing continuously.
   ───────────────────────────────────────────────────────────────────────── */
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
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
            <motion.div
              initial={false}
              animate={{ scaleX: i <= s ? 1 : 0 }}
              transition={springFast}
              style={{ height: '100%', borderRadius: '999px', background: colors[s] || 'transparent', transformOrigin: 'left' }}
            />
          </div>
        ))}
      </div>
      {s > 0 && <span style={{ fontSize: '11px', color: colors[s] }}>{labels[s]}</span>}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="n-label" style={{ display: 'block', marginBottom: '6px' }}>{label}</label>
    {children}
  </div>
);

/* The promises the research says users need to see BEFORE they commit. */
const PROMISES = [
  { icon: Landmark,    title: 'No bank login, ever',   body: 'Connecting an account is optional. Import a statement or add entries by hand and still get everything.' },
  { icon: Zap,         title: 'Two taps to log a spend', body: 'Amount, category, done. Or let a bank SMS, a CSV, or a photo of a receipt do it for you.' },
  { icon: ShieldCheck, title: 'Your data stays yours',  body: 'Export it any time. Delete it in one action. Nothing is sold, nothing is shared.' },
];

const LoginPage = () => {
  const { isLoggedIn, login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup]     = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  // Forgot-password states
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotSent, setForgotSent]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError]     = useState('');

  // Login is dark-only by design — pin `data-theme="dark"` while mounted, then
  // hand the theme back to the user's real preference for the authed app.
  useEffect(() => {
    const el = document.documentElement;
    const pin = () => { if (el.getAttribute('data-theme') !== 'dark') el.setAttribute('data-theme', 'dark'); };
    pin();
    const mo = new MutationObserver(pin);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mo.disconnect();
      const saved = localStorage.getItem('finance_theme');
      const want = (saved === 'dark' || saved === 'light')
        ? saved
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      el.setAttribute('data-theme', want);
    };
  }, []);

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const upd = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); setError(''); };

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (isSignup) {
        if (!form.username || !form.email || !form.password || !form.confirm) { setError('All fields are required.'); return; }
        if (form.password.length < 8)              { setError('Password must be at least 8 characters.'); return; }
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

  const googleHref = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/google`;

  return (
    <div className="auth-shell">

      {/* ── Left: the story. Hidden below 940px. ─────────────────────────── */}
      <aside className="auth-aside">
        <motion.div
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.42, 1] }}
        >
          <div className="clario-logo">
            <LogoMark size={38} />
            <LogoWordmark height={25} />
          </div>
        </motion.div>

        <h2 className="auth-display" key={isSignup ? 'signup' : 'login'}>
          {(isSignup
            ? ['Start with one number.', 'Not your bank login.']
            : ['Know where it went.', 'Without handing over your bank.']
          ).map((line, i) => (
            <span className="auth-display-line" key={line}>
              <motion.span
                initial={{ opacity: 0, y: '0.5em', filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: '0em', filter: 'blur(0px)' }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.16, ease: [0.33, 1, 0.42, 1] }}
              >{line}</motion.span>
            </span>
          ))}
        </h2>

        <ul className="auth-promises">
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 16, filter: 'blur(7px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.55 + i * 0.12, ease: [0.33, 1, 0.42, 1] }}
            >
              <span className="auth-promise-icon"><Icon size={15} strokeWidth={1.7} /></span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </aside>

      {/* ── Right: orange-black frame containing the form ────────────────── */}
      <main className="auth-main">
        <div className="auth-right-frame">
          {/* animated ShaderGradient water-plane behind the card — dark only */}
          <ShaderBg
            props={AUTH_SHADER_DARK}
            className="auth-shader-bg"
            opacity={0.95}
          />
          <motion.div
            className="auth-panel"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={spring}
          >
          <button type="button" className="auth-back" onClick={() => navigate('/')} aria-label="Back to home">
            <ArrowLeft size={15} weight="bold" /> Back
          </button>
          <header className="auth-head">
            <h1>{isSignup ? 'Create your account' : 'Log in to Clario'}</h1>
            <p>
              {isSignup
                ? 'Free, and no card required.'
                : 'Enter your details to continue.'}
            </p>
          </header>

          {/* Error — height animates so nothing jumps */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={springFast}
                style={{ overflow: 'hidden' }}
              >
                <div className="auth-error" role="alert">{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <a href={googleHref} className="n-btn n-btn-default n-btn-full auth-oauth">
            <svg width="17" height="17" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </a>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={submit} className="auth-form">
            <Field label={isSignup ? 'Username' : 'Username or email'}>
              <input className="n-input" type="text" value={form.username} onChange={upd('username')}
                placeholder={isSignup ? 'e.g. yeshwanth' : 'Enter username or email'}
                autoComplete="username" autoFocus required
              />
            </Field>

            <AnimatePresence initial={false}>
              {isSignup && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springFast}
                  style={{ overflow: 'hidden' }}
                >
                  <Field label="Email address">
                    <input className="n-input" type="email" value={form.email} onChange={upd('email')}
                      placeholder="you@example.com" autoComplete="email" required
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input className="n-input" type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={upd('password')} placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  style={{ paddingRight: '40px' }} required
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="auth-eye"
                  aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {isSignup && <PasswordStrength password={form.password} />}
              {!isSignup && (
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <button type="button" className="auth-link"
                    onClick={() => { setForgotMode(p => !p); setForgotSent(false); setForgotError(''); }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </Field>

            <AnimatePresence initial={false}>
              {isSignup && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springFast}
                  style={{ overflow: 'hidden' }}
                >
                  <Field label="Confirm password">
                    <input className="n-input" type="password" value={form.confirm} onChange={upd('confirm')}
                      placeholder="Re-enter password" autoComplete="new-password" required
                      style={{ borderColor: form.confirm && form.password !== form.confirm ? 'var(--red)' : undefined }}
                    />
                    {form.confirm && form.password !== form.confirm && (
                      <p style={{ color: 'var(--red)', fontSize: '11.5px', marginTop: '5px' }}>Passwords don't match</p>
                    )}
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="n-btn n-btn-primary n-btn-full auth-submit">
              {loading
                ? <><Loader2 size={15} className="auth-spin" /> {isSignup ? 'Creating account…' : 'Signing in…'}</>
                : (isSignup ? 'Create account' : 'Continue')
              }
            </button>
          </form>

          {/* Inline forgot-password panel */}
          <AnimatePresence>
            {forgotMode && !isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={springFast}
                style={{ overflow: 'hidden' }}
              >
                <div className="auth-forgot">
                  {forgotSent ? (
                    <div className="auth-sent">Check your email for a reset link.</div>
                  ) : (
                    <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label className="n-label">Enter your account email</label>
                      {forgotError && <p style={{ color: 'var(--red)', fontSize: '12px', margin: 0 }}>{forgotError}</p>}
                      <input className="n-input" type="email" placeholder="you@example.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" disabled={forgotLoading} className="n-btn n-btn-primary n-btn-sm" style={{ flex: 1 }}>
                          {forgotLoading ? <><Loader2 size={13} className="auth-spin" /> Sending…</> : 'Send reset link'}
                        </button>
                        <button type="button" onClick={() => setForgotMode(false)} className="n-btn n-btn-default n-btn-sm">
                          <ArrowLeft size={13} /> Back
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="auth-foot">
            <span>{isSignup ? 'Already have an account? ' : "Don't have an account? "}</span>
            <button onClick={toggle} className="auth-link auth-link--strong">
              {isSignup ? 'Log in' : 'Sign up for free'}
            </button>
          </footer>

          {/* The promise, restated where the decision is actually made */}
          <div className="auth-trust-container">
            <div className="clario-trust auth-trust">
              <ShieldCheck size={14} strokeWidth={1.9} />
              You never have to connect a bank account.
            </div>
            <p className="auth-legal">By continuing, you agree to our Terms &amp; Privacy Policy.</p>
          </div>
        </motion.div>
      </div>{/* end auth-right-frame */}
    </main>
    </div>
  );
};

export default LoginPage;
