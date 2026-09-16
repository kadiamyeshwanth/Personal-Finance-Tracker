import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  GearSix as Settings,
  User as User,
  Lock as Lock,
  Trash as Trash2,
  Warning as AlertTriangle,
  Eye as Eye,
  EyeSlash as EyeOff,
  CheckCircle as CheckCircle2,
  Shield as Shield,
  Database as Database,
  CreditCard as CreditCard,
  Target as Target,
  Wallet as Wallet,
  Moon as Moon,
  Sun as Sun,
  X as X,
  Sparkle as Sparkles,
  ChatText as MessageSquare,
  Copy as Copy,
  ArrowsClockwise as RefreshCw,
  ArrowSquareOut as ExternalLink,
  Checks as CheckCheck,
  Lightning as Zap,
  DeviceMobile,
  GearSix,
  Wrench,
  Export,
  Warning,
} from '@phosphor-icons/react';
import { getPersonalityVisual } from '../lib/personality';
import { getUserStats, updateProfile, changePassword, deleteAccount, clearAllData } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import { getAvatar, setAvatar, fileToSquareDataURL } from '../lib/profile';
import { getA11y, setA11y } from '../lib/a11y';
import { PersonArmsSpread, TextAa } from '@phosphor-icons/react';
import client from '../api/client';

// ── Password Strength Indicator ───────────────────────────────────────────────
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['transparent', 'var(--red)', 'var(--yellow)', 'var(--yellow)', 'var(--green)', 'var(--green)'];
  return { score, label: labels[score] || '', color: colors[score] };
};

const PasswordStrength = ({ password }) => {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= score ? color : 'var(--border-strong)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: '11px', color, fontWeight: 500 }}>{label}</span>
    </div>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ open, title, description, confirmText, onConfirm, onClose, danger = true }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Same fix as InvestmentsPage's Add/Edit modal — worth being extra
            careful here specifically, since this dialog guards destructive
            actions (delete account / delete data). A static `transform` in
            `style` cannot coexist with Framer Motion's own animated
            `scale`/`y` on the same element: FM owns `transform` outright once
            any motion value touches it and silently drops the manual centring
            offset, which is what left this exact Cancel button unreachable.
            Flexbox centring needs no transform at all, so there's nothing
            left for FM to clash with. */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,15,15,0.4)', backdropFilter: 'blur(4px)' }}
        />
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', pointerEvents: 'none' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ duration: 0.15 }}
          style={{
            pointerEvents: 'auto', width: '400px', maxWidth: '100%', maxHeight: '100%', overflowY: 'auto',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '24px', boxShadow: 'var(--shadow-float)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--r-md)', flexShrink: 0,
              background: danger ? 'var(--red-bg)' : 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={17} style={{ color: danger ? 'var(--red)' : 'var(--text-2)' }} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{description}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="n-btn n-btn-default n-btn-sm">Cancel</button>
            <button onClick={onConfirm} className={`n-btn n-btn-sm ${danger ? 'n-btn-danger-solid' : 'n-btn-primary'}`}>{confirmText}</button>
          </div>
        </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
/* A plain settings group: a small title, an optional line under it, and one
   filled card holding the rows (styles/instrument.css `.st-*`). The old icon
   plate + accent colour props are still accepted and ignored. */
// eslint-disable-next-line no-unused-vars
const Section = ({ icon, accentColor, title, subtitle, children }) => (
  <section className="st-sec">
    <div className="st-sec-head">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="st-card">{children}</div>
  </section>
);

// ── Finance Avatar Section ────────────────────────────────────────────────────
/* The local map here was keyed on the display title ('Silent Saver') while the
   endpoint returns `type` ('saver'), so the lookup never matched and this card
   silently rendered its empty state for every user. It now shares the same
   type-keyed map as the Dashboard and Wrapped. */

const AvatarSection = () => {
  const [personality, setPersonality] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    client.get('/insights/personality')
      .then(r => setPersonality(r.data?.type))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const av = personality ? getPersonalityVisual(personality) : null;
  return (
    <Section icon={Sparkles} title="Finance Personality" subtitle="Your AI-detected financial archetype" accentColor="var(--brand)">
      {loading ? (
        <div className="n-skeleton" style={{ height: '60px', borderRadius: 'var(--r-md)' }} />
      ) : personality && av ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--brand-bg, rgba(232,80,2,0.10))', border: '1px solid rgba(232,80,2,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <av.Icon size={26} weight="fill" style={{ color: 'var(--brand)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand)', marginBottom: '4px' }}>{av.label}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{av.desc}</div>
          </div>
          <a href="/ai-insights" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            Full analysis →
          </a>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.7 }}>
          Add more transactions to unlock your finance personality type. We need at least 10 transactions to analyze your spending patterns.
          <a href="/ai-insights" style={{ display: 'inline-flex', marginLeft: '6px', color: 'var(--accent)', fontSize: '13px' }}>Go to AI Insights →</a>
        </div>
      )}
    </Section>
  );
};

// ── SMS Auto-Import Setup Section ────────────────────────────────────────────
const SMSSetupSection = () => {
  const [setup, setSetup]     = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied]   = React.useState(false);
  const [regen, setRegen]     = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [showHistory, setShowHistory] = React.useState(false);

  const fetchSetup = () => {
    setLoading(true);
    client.get('/sms/setup')
      .then(r => setSetup(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  React.useEffect(() => { fetchSetup(); }, []);

  const copyUrl = () => {
    if (!setup?.webhookUrl) return;
    navigator.clipboard.writeText(setup.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!window.confirm('Regenerate token? Your old webhook URL will stop working immediately.')) return;
    setRegen(true);
    try {
      const r = await client.post('/sms/token/regenerate');
      setSetup(r.data);
      toast.success('Webhook URL regenerated!');
    } catch { toast.error('Failed to regenerate'); }
    finally { setRegen(false); }
  };

  const loadHistory = () => {
    client.get('/sms/history').then(r => setHistory(r.data)).catch(() => {});
    setShowHistory(true);
  };

  const APPS = [
    {
      name: 'SMS Forwarder (Android)',
      Icon: DeviceMobile,
      steps: ['Install "SMS Forwarder" by Bogdan Melnychuk from Play Store', 'Open app → tap "+" → Select "HTTP" filter', 'Set URL to your webhook URL below', 'Set Method to POST, Body format: JSON', 'Add filter: Sender contains "HDFC" OR "SBI" OR "ICICI" OR "GPay" etc.', 'Save and enable the rule'],
      url: 'https://play.google.com/store/apps/details?id=com.bogdan.sms',
    },
    {
      name: 'MacroDroid (Advanced)',
      Icon: GearSix,
      steps: ['Install MacroDroid from Play Store', 'Create new Macro → Trigger: SMS Received', 'Add filter: From number contains bank SMS sender', 'Add Action: HTTP Request', 'Set URL = your webhook URL, Method = POST', 'Set body: {"message": "{sms_body}", "from": "{sms_sender}"}'],
      url: 'https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid',
    },
    {
      name: 'Tasker (Power Users)',
      Icon: Wrench,
      steps: ['Install Tasker from Play Store', 'Profile → Event → Phone → SMS → From: bank sender', 'Task: Net → HTTP Request → Method: POST', 'URL = your webhook URL', 'Body: {"message":"%SMSRB","from":"%SMSRF"}', 'Test with a bank OTP or transaction SMS'],
      url: 'https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm',
    },
    {
      name: 'Auto Forward SMS',
      Icon: Export,
      steps: ['Install "Auto Forward SMS" from Play Store', 'Add new rule → HTTP Webhook', 'Paste your webhook URL', 'Set sender filter to your bank names', 'Enable the rule and test it'],
      url: 'https://play.google.com/store/search?q=auto+forward+sms&c=apps',
    },
  ];

  const [activeApp, setActiveApp] = React.useState(0);

  return (
    <Section icon={MessageSquare} title="SMS Auto-Import" subtitle="Transactions auto-added when you receive a bank/UPI payment SMS" accentColor="#22c55e">
      {loading ? (
        <div className="n-skeleton" style={{ height: '80px', borderRadius: 'var(--r-md)' }} />
      ) : setup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'n-pulse 2s infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>WEBHOOK ACTIVE</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: 'auto' }}>
              Supports GPay · PhonePe · Paytm · HDFC · SBI · ICICI · Axis + more
            </span>
          </div>

          {/* Webhook URL box */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Your personal webhook URL
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                flex: 1, padding: '9px 12px', background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)', borderRadius: 'var(--r)',
                fontSize: '12px', color: 'var(--text-2)', fontFamily: 'monospace',
                wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {setup.webhookUrl}
              </div>
              <button onClick={copyUrl} className={`n-btn n-btn-sm ${copied ? 'n-btn-primary' : 'n-btn-default'}`}
                style={{ gap: '5px', flexShrink: 0, minWidth: '80px' }}>
                {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '5px' }}>
              <Warning size={12} weight="fill" style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--red)' }} />
              Keep this URL private — anyone with it can add transactions to your account
            </div>
          </div>

          {/* App Setup Guide */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Setup guide — choose your app
            </div>
            {/* App tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {APPS.map((app, i) => (
                <button key={app.name} onClick={() => setActiveApp(i)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--r)', fontSize: '12px', border: '1px solid',
                    cursor: 'pointer', fontWeight: activeApp === i ? 600 : 400,
                    background: activeApp === i ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                    borderColor: activeApp === i ? 'var(--accent)' : 'var(--border)',
                    color: activeApp === i ? 'var(--accent)' : 'var(--text-2)',
                  }}>
                  <app.Icon size={14} weight="fill" style={{ marginRight: 6, verticalAlign: '-2px' }} />{app.name}
                </button>
              ))}
            </div>

            {/* Step list */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {React.createElement(APPS[activeApp].Icon, { size: 15, weight: 'fill', style: { marginRight: 7, verticalAlign: '-2px' } })}{APPS[activeApp].name}
                </span>
                <a href={APPS[activeApp].url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                  Play Store <ExternalLink size={10} />
                </a>
              </div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {APPS[activeApp].steps.map((step, i) => (
                  <li key={i} style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {step.includes('webhook URL') ? (
                      <>
                        {step.split('webhook URL')[0]}
                        <strong style={{ color: 'var(--accent)' }}>webhook URL</strong>
                        {step.split('webhook URL')[1]}
                      </>
                    ) : step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Test + History row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={loadHistory} className="n-btn n-btn-default n-btn-sm" style={{ gap: '5px' }}>
              <Zap size={12} /> View recent auto-imports
            </button>
            <button onClick={regenerate} disabled={regen} className="n-btn n-btn-ghost n-btn-sm" style={{ gap: '5px', marginLeft: 'auto', color: 'var(--red)' }}>
              {regen ? <><RefreshCw size={12} style={{ animation: 'n-spin 1s linear infinite' }} /> Regenerating…</> : <><RefreshCw size={12} /> Reset URL</>}
            </button>
          </div>

          {/* History list */}
          {showHistory && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Recent SMS Auto-Imports
              </div>
              {history.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  No auto-imports yet. Set up a forwarder app and pay someone via UPI to test it!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.slice(0, 10).map(t => (
                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: t.type === 'income' ? 'var(--green)' : 'var(--text)', minWidth: '80px', fontVariantNumeric: 'tabular-nums' }}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-2)', flex: 1 }}>{t.description}</span>
                      <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>{t.category}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{new Date(t.date).toLocaleDateString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Failed to load SMS setup. Please refresh.</div>
      )}
      <style>{`@keyframes n-pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </Section>
  );
};

// ── Main SettingsPage ─────────────────────────────────────────────────────────
const SettingsPage = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const qc = useQueryClient();

  // Profile form
  const [username, setUsername] = useState(currentUser?.username || '');
  const [avatar, setAvatarState] = useState(getAvatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = React.useRef(null);

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const dataUrl = await fileToSquareDataURL(file, 256);
      setAvatar(dataUrl);
      setAvatarState(dataUrl);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Could not use that image');
    } finally {
      setAvatarBusy(false);
    }
  };
  const removeAvatar = () => { setAvatar(null); setAvatarState(null); toast.success('Profile photo removed'); };

  // Accessibility preferences
  const [a11y, setA11yState] = useState(getA11y);
  const patchA11y = (patch) => setA11yState(setA11y(patch));

  // Password form
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  // Modals
  const [deleteModal, setDeleteModal] = useState(false);
  const [clearModal, setClearModal] = useState(false);

  // Stats query
  const { data: stats } = useQuery({ queryKey: ['userStats'], queryFn: getUserStats });

  // Mutations
  const profileMut = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update profile'),
  });

  const passwordMut = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to change password'),
  });

  const deleteAccountMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete account'),
  });

  const clearDataMut = useMutation({
    mutationFn: clearAllData,
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted?.transactions || 0} transactions, ${data.deleted?.goals || 0} goals, ${data.deleted?.budgets || 0} budgets`);
      qc.invalidateQueries();
      setClearModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to clear data'),
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (username === currentUser?.username) { toast('No changes to save'); return; }
    profileMut.mutate({ username });
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Both fields are required'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    passwordMut.mutate(pwForm);
  };

  // Sections live in tabs; the profile menu links straight to one (?tab=…)
  const [searchParams, setSearchParams] = useSearchParams();
  const TABS = [['account', 'Account'], ['preferences', 'Preferences'], ['import', 'Import'], ['data', 'Data']];
  const tab = TABS.some(([k]) => k === searchParams.get('tab')) ? searchParams.get('tab') : 'account';
  const setTab = (k) => setSearchParams(k === 'account' ? {} : { tab: k }, { replace: true });

  return (
    <div className="st">
      <header className="st-head">
        <h1>Settings</h1>
        <p>Your account, how Clario looks, and your data.</p>
      </header>

      <div className="st-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k}
            className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'account' && (
      <>
      <Section title="Profile">
        <div className="st-row">
          <Avatar name={currentUser?.username} size={48} radius={14} />
          <div className="st-row-main">
            <b>{currentUser?.username}</b>
            <span>{stats?.memberSince
              ? `Member since ${new Date(stats.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
              : currentUser?.email}</span>
          </div>
          <div className="st-row-actions">
            <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
            <button type="button" className="n-btn n-btn-default n-btn-sm" disabled={avatarBusy} onClick={() => fileRef.current?.click()}>
              {avatarBusy ? 'Processing…' : avatar ? 'Change photo' : 'Add photo'}
            </button>
            {avatar && <button type="button" className="n-btn n-btn-ghost n-btn-sm" onClick={removeAvatar}>Remove</button>}
          </div>
        </div>
        <form onSubmit={handleProfileSave} className="st-form">
          <div className="st-grid">
            <div>
              <label className="n-label" htmlFor="st-username">Username</label>
              <input id="st-username" className="n-input" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="Your username" maxLength={20} />
            </div>
            <div>
              <label className="n-label" htmlFor="st-email">Email</label>
              <input id="st-email" className="n-input" value={currentUser?.email || ''} disabled />
            </div>
          </div>
          <div className="st-form-foot">
            <button type="submit" disabled={profileMut.isPending} className="n-btn n-btn-primary n-btn-sm">
              {profileMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Password" subtitle="You'll need your current password.">
        <form onSubmit={handlePasswordChange} className="st-form">
          <div className="st-grid">
            <div>
              <label className="n-label" htmlFor="st-pw-current">Current password</label>
              <div className="st-pw">
                <input id="st-pw-current" className="n-input" type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword} autoComplete="current-password"
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                <button type="button" onClick={() => setShowCurrent(p => !p)} aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="n-label" htmlFor="st-pw-new">New password</label>
              <div className="st-pw">
                <input id="st-pw-new" className="n-input" type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword} placeholder="At least 8 characters" autoComplete="new-password"
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                <button type="button" onClick={() => setShowNew(p => !p)} aria-label={showNew ? 'Hide password' : 'Show password'}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrength password={pwForm.newPassword} />
            </div>
          </div>
          <div className="st-form-foot">
            <button type="submit" disabled={passwordMut.isPending} className="n-btn n-btn-primary n-btn-sm">
              {passwordMut.isPending ? 'Updating…' : 'Change password'}
            </button>
          </div>
        </form>
      </Section>

      {stats && (
        <Section title="At a glance">
          <div className="st-stats">
            {[['Transactions', stats.transactions], ['Goals', stats.goals], ['Budgets', stats.budgets]].map(([label, value]) => (
              <div key={label}><span className="ins-k">{label}</span><strong>{value ?? 0}</strong></div>
            ))}
          </div>
        </Section>
      )}

      <AvatarSection />
      </>
      )}

      {tab === 'preferences' && (
      <>
      <Section title="Appearance">
        <div className="st-row">
          <div className="st-row-main"><b>Theme</b><span>Applies across the whole app.</span></div>
          <div className="a11y-seg" role="group" aria-label="Theme">
            {[['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([value, label, Icon]) => (
              <button key={value} type="button" aria-pressed={theme === value}
                className={theme === value ? 'is-on' : ''}
                onClick={() => theme !== value && toggleTheme()}>
                <Icon size={13} weight="fill" style={{ verticalAlign: '-2px', marginRight: 5 }} />{label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Accessibility" subtitle="Applied instantly and remembered on this device.">
        <div className="a11y-list">
          <label className="a11y-row">
            <div>
              <b>Reduce motion</b>
              <span>Turn off page transitions, parallax and looping animations.</span>
            </div>
            <button type="button" role="switch" aria-checked={a11y.reduceMotion}
              className={`a11y-switch${a11y.reduceMotion ? ' is-on' : ''}`}
              onClick={() => patchA11y({ reduceMotion: !a11y.reduceMotion })}><i /></button>
          </label>

          <div className="a11y-row">
            <div>
              <b><TextAa size={14} weight="fill" style={{ verticalAlign: '-2px', marginRight: 4 }} />Text size</b>
              <span>Scale the whole interface up for easier reading.</span>
            </div>
            <div className="a11y-seg">
              {[['default', 'Default'], ['large', 'Large'], ['xlarge', 'Larger']].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={a11y.textSize === v}
                  className={a11y.textSize === v ? 'is-on' : ''}
                  onClick={() => patchA11y({ textSize: v })}>{l}</button>
              ))}
            </div>
          </div>

          <label className="a11y-row">
            <div>
              <b>High contrast</b>
              <span>Stronger borders and darker text for better legibility.</span>
            </div>
            <button type="button" role="switch" aria-checked={a11y.highContrast}
              className={`a11y-switch${a11y.highContrast ? ' is-on' : ''}`}
              onClick={() => patchA11y({ highContrast: !a11y.highContrast })}><i /></button>
          </label>

          <label className="a11y-row">
            <div>
              <b>Always underline links</b>
              <span>Don't rely on colour alone to mark links.</span>
            </div>
            <button type="button" role="switch" aria-checked={a11y.underlineLinks}
              className={`a11y-switch${a11y.underlineLinks ? ' is-on' : ''}`}
              onClick={() => patchA11y({ underlineLinks: !a11y.underlineLinks })}><i /></button>
          </label>
        </div>
      </Section>
      </>
      )}

      {tab === 'import' && <SMSSetupSection />}

      {tab === 'data' && (
        <Section title="Your data" subtitle="These can't be undone.">
          <div className="st-row">
            <div className="st-row-main"><b>Clear all data</b><span>Delete every transaction, goal and budget. Your account stays.</span></div>
            <button className="n-btn n-btn-default n-btn-sm" onClick={() => setClearModal(true)}>Clear data</button>
          </div>
          <div className="st-row">
            <div className="st-row-main"><b className="st-danger">Delete account</b><span>Remove your account and everything in it, permanently.</span></div>
            <button className="n-btn n-btn-danger n-btn-sm" onClick={() => setDeleteModal(true)}>Delete account</button>
          </div>
        </Section>
      )}

      {/* Modals */}
      <ConfirmModal
        open={clearModal}
        title="Clear all data?"
        description="This will permanently delete all your transactions, goals, and budgets. Your account will remain active. This action cannot be undone."
        confirmText="Yes, clear everything"
        onConfirm={() => clearDataMut.mutate()}
        onClose={() => setClearModal(false)}
      />
      <ConfirmModal
        open={deleteModal}
        title="Delete your account?"
        description="This will permanently delete your account and all associated data. You will be logged out immediately. This action cannot be undone."
        confirmText="Yes, delete my account"
        onConfirm={() => deleteAccountMut.mutate()}
        onClose={() => setDeleteModal(false)}
      />
    </div>
  );
};

export default SettingsPage;
