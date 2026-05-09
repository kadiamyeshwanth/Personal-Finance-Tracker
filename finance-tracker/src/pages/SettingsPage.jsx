import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Settings, User, Lock, Trash2, AlertTriangle,
  Eye, EyeOff, CheckCircle2, Shield, Database,
  CreditCard, Target, Wallet, Moon, Sun, X,
} from 'lucide-react';
import { getUserStats, updateProfile, changePassword, deleteAccount, clearAllData } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/ui/PageHeader';

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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,15,15,0.4)', backdropFilter: 'blur(4px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 1001, width: '400px', maxWidth: 'calc(100vw - 32px)',
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
      </>
    )}
  </AnimatePresence>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, subtitle, children, accentColor }) => (
  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '24px' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '16px 20px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: 'var(--r)',
        background: accentColor ? `${accentColor}15` : 'var(--bg)',
        border: `1px solid ${accentColor ? `${accentColor}30` : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} style={{ color: accentColor || 'var(--text-2)' }} strokeWidth={1.5} />
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

// ── Main SettingsPage ─────────────────────────────────────────────────────────
const SettingsPage = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const qc = useQueryClient();

  // Profile form
  const [username, setUsername] = useState(currentUser?.username || '');

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

  const initials = currentUser?.username?.[0]?.toUpperCase() || 'U';

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Settings"
        subtitle="Manage your account, preferences, and data."
      />

      {/* Account overview card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
        marginBottom: '32px', background: 'var(--bg)',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #2383e2, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 700, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{currentUser?.username}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{currentUser?.email}</div>
          {stats?.memberSince && (
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
              Member since {new Date(stats.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { icon: CreditCard, label: 'Transactions', value: stats.transactions },
              { icon: Target,     label: 'Goals',        value: stats.goals },
              { icon: Wallet,     label: 'Budgets',      value: stats.budgets },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile" subtitle="Update your display name">
        <form onSubmit={handleProfileSave} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="n-label">Username</label>
            <input
              className="n-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
              maxLength={20}
            />
          </div>
          <div>
            <label className="n-label">Email</label>
            <input
              className="n-input"
              value={currentUser?.email || ''}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
          <button type="submit" disabled={profileMut.isPending} className="n-btn n-btn-primary n-btn-sm" style={{ height: '36px' }}>
            {profileMut.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Password" subtitle="Requires your current password">
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="n-label">Current password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="n-input"
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  style={{ paddingRight: '36px' }}
                />
                <button type="button" onClick={() => setShowCurrent(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px' }}>
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="n-label">New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="n-input"
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="At least 8 characters"
                  style={{ paddingRight: '36px' }}
                />
                <button type="button" onClick={() => setShowNew(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px' }}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PasswordStrength password={pwForm.newPassword} />
            </div>
          </div>
          <button type="submit" disabled={passwordMut.isPending} className="n-btn n-btn-primary n-btn-sm">
            {passwordMut.isPending ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </Section>

      {/* Appearance */}
      <Section icon={theme === 'dark' ? Moon : Sun} title="Appearance" subtitle="Choose your preferred color scheme">
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Light', value: 'light', icon: Sun },
            { label: 'Dark',  value: 'dark',  icon: Moon },
          ].map(({ label, value, icon: Icon }) => (
            <motion.button
              key={value}
              whileHover={{ borderColor: 'var(--accent)' }}
              onClick={() => theme !== value && toggleTheme()}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '16px 24px', border: `1.5px solid ${theme === value ? 'var(--accent)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--r-md)', background: 'var(--bg)', cursor: 'pointer',
                color: theme === value ? 'var(--accent)' : 'var(--text-2)',
                transition: 'border-color 0.15s, color 0.15s',
                width: '100px',
              }}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
              {theme === value && <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />}
            </motion.button>
          ))}
        </div>
      </Section>

      {/* Security Info */}
      <Section icon={Shield} title="Security" subtitle="Account security information" accentColor="#2383e2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Authentication', value: 'JWT (7-day tokens)' },
            { label: 'Password hashing', value: 'bcrypt (salt rounds: 10)' },
            { label: 'Data isolation', value: 'All data scoped to your account' },
            { label: 'Rate limiting', value: 'Auth: 20 req/15min · API: 300 req/min' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{label}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <Section icon={AlertTriangle} title="Danger Zone" subtitle="Irreversible actions — proceed with caution" accentColor="#c4554d">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Clear all data</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Delete all transactions, goals, and budgets. Keep your account.</div>
            </div>
            <button className="n-btn n-btn-danger n-btn-sm" onClick={() => setClearModal(true)}>
              <Database size={13} /> Clear data
            </button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', border: '1px solid rgba(196,85,77,0.3)', borderRadius: 'var(--r-md)',
            background: 'rgba(196,85,77,0.03)',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--red)' }}>Delete account</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Permanently delete your account and all associated data. This cannot be undone.</div>
            </div>
            <button className="n-btn n-btn-danger n-btn-sm" onClick={() => setDeleteModal(true)}>
              <Trash2 size={13} /> Delete account
            </button>
          </div>
        </div>
      </Section>

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
