/**
 * FamilyPage — Shared family finance dashboard
 * Create or join a family group, view combined spending,
 * per-member breakdowns, and shared categories.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, LogIn, Copy, CheckCircle2, Trash2,
  TrendingUp, TrendingDown, ArrowRight, Crown, UserMinus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── API helpers ───────────────────────────────────────────────────────────────
const getFamily       = ()     => client.get('/family').then(r => r.data);
const getDashboard    = ()     => client.get('/family/dashboard').then(r => r.data);
const createFamily    = (name) => client.post('/family/create', { name }).then(r => r.data);
const joinFamily      = (code) => client.post('/family/join', { inviteCode: code }).then(r => r.data);
const leaveFamily     = ()     => client.delete('/family/leave').then(r => r.data);

// ── Member avatar ────────────────────────────────────────────────────────────
const MemberAvatar = ({ username, isOwner, size = 32 }) => {
  const colors = ['#2383e2', '#0f7b6c', '#9065b0', '#d9730d', '#c4554d', '#6366f1'];
  const color = colors[username?.charCodeAt(0) % colors.length];
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '6px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
        {username?.[0]?.toUpperCase()}
      </div>
      {isOwner && (
        <div style={{ position: 'absolute', bottom: -3, right: -3, background: '#f59e0b', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Crown size={7} color="#fff" />
        </div>
      )}
    </div>
  );
};

// ── Member spending card ──────────────────────────────────────────────────────
const MemberCard = ({ data, isOwner }) => (
  <motion.div whileHover={{ boxShadow: 'var(--shadow-sm)' }}
    style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <MemberAvatar username={data.member.username} isOwner={isOwner} size={36} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          {data.member.username}
          {isOwner && <Crown size={11} style={{ color: '#f59e0b' }} />}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{data.member.email}</div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
      {[
        { label: 'Income',   value: data.income,   color: 'var(--green)' },
        { label: 'Expenses', value: data.expenses, color: 'var(--red)'   },
        { label: 'Net',      value: data.net,      color: data.net >= 0 ? 'var(--text)' : 'var(--red)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
            ₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      ))}
    </div>

    {/* Top categories */}
    {Object.entries(data.catMap).length > 0 && (
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px' }}>Top categories</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Object.entries(data.catMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => (
            <span key={cat} className="n-tag n-tag-gray" style={{ fontSize: '11px' }}>
              {cat}: ₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

// ── Create / Join modal ───────────────────────────────────────────────────────
const SetupModal = ({ onClose, onDone }) => {
  const [tab, setTab]       = useState('create');
  const [name, setName]     = useState('');
  const [code, setCode]     = useState('');
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: createFamily,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); toast.success('Family group created! 🏠'); onDone(); },
    onError: e  => toast.error(e.response?.data?.error || 'Failed to create'),
  });

  const joinMut = useMutation({
    mutationFn: () => joinFamily(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); toast.success('Joined family! 👨‍👩‍👧'); onDone(); },
    onError: e  => toast.error(e.response?.data?.error || 'Invalid invite code'),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)', width: '400px', maxWidth: '95vw', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={15} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Family Finance</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['create', 'join'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px', border: 'none', background: tab === t ? 'var(--bg)' : 'var(--bg-secondary)', fontSize: '13px', fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--text)' : 'var(--text-3)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}>
              {t === 'create' ? '+ Create group' : '→ Join with code'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {tab === 'create' ? (
            <div>
              <label className="n-label">Family name</label>
              <input className="n-input" placeholder="e.g. The Sharma Family" value={name} onChange={e => setName(e.target.value)} style={{ height: '36px', marginBottom: '14px' }} />
              <button className="n-btn n-btn-primary n-btn-sm n-btn-full" disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate(name)}>
                {createMut.isPending ? 'Creating…' : <><Plus size={13} /> Create family group</>}
              </button>
            </div>
          ) : (
            <div>
              <label className="n-label">Enter invite code</label>
              <input className="n-input" placeholder="e.g. AB1C2D" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} style={{ height: '36px', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '16px', fontWeight: 600 }} />
              <button className="n-btn n-btn-primary n-btn-sm n-btn-full" disabled={code.length < 4 || joinMut.isPending} onClick={() => joinMut.mutate()}>
                {joinMut.isPending ? 'Joining…' : <><LogIn size={13} /> Join family</>}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', textAlign: 'right' }}>
          <button className="n-btn n-btn-ghost n-btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const FamilyPage = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied]       = useState(false);

  const { data: family,    isLoading: fl } = useQuery({ queryKey: ['family'],          queryFn: getFamily,    staleTime: 60_000 });
  const { data: dashboard, isLoading: dl } = useQuery({ queryKey: ['family-dashboard'], queryFn: getDashboard, staleTime: 30_000, enabled: !!family });

  const leaveMut = useMutation({
    mutationFn: leaveFamily,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); qc.removeQueries({ queryKey: ['family-dashboard'] }); toast.success('Left family group'); },
    onError: e  => toast.error(e.response?.data?.error || 'Failed to leave'),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite code copied!');
  };

  if (fl) {
    return (
      <div>
        <PageHeader icon={Users} title="Family Finance" subtitle="Shared finances for your household" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="n-skeleton" style={{ height: '120px', borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    );
  }

  // Not in a family yet
  if (!family) {
    return (
      <div>
        <PageHeader icon={Users} title="Family Finance" subtitle="Track finances together with your household" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
          <motion.div whileHover={{ boxShadow: 'var(--shadow-sm)' }}
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => setShowSetup(true)}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Plus size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Create a family group</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>Start a shared dashboard and invite your household members</div>
          </motion.div>

          <motion.div whileHover={{ boxShadow: 'var(--shadow-sm)' }}
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => setShowSetup(true)}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <LogIn size={22} style={{ color: 'var(--green)' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Join a family group</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>Enter a 6-character invite code from your family admin</div>
          </motion.div>
        </div>

        <div style={{ marginTop: '24px', padding: '14px 16px', background: 'var(--blue-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(35,131,226,0.15)', maxWidth: '600px', margin: '24px auto 0', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--accent)' }}>👨‍👩‍👧 How it works:</strong> Create a group and share the invite code with family members. Each person keeps their own account — you'll see a combined view of this month's spending.
        </div>

        {showSetup && <SetupModal onClose={() => setShowSetup(false)} onDone={() => setShowSetup(false)} />}
      </div>
    );
  }

  // In a family — show dashboard
  const isOwner = family.createdBy?._id === currentUser?._id || family.createdBy === currentUser?._id;

  return (
    <div>
      <PageHeader icon={Users} title={family.name} subtitle={`${family.members?.length || 0} members · This month's shared finances`}>
        <button className="n-btn n-btn-default n-btn-sm" onClick={copyCode} style={{ gap: '5px' }}>
          {copied ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> : <Copy size={13} />}
          {copied ? 'Copied!' : `Code: ${family.inviteCode}`}
        </button>
        <button className="n-btn n-btn-danger n-btn-sm" onClick={() => { if (window.confirm('Leave this family group?')) leaveMut.mutate(); }} disabled={leaveMut.isPending}>
          <UserMinus size={13} /> Leave
        </button>
      </PageHeader>

      {/* Combined totals */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Combined Income',   value: dashboard.combined.income,   color: 'var(--green)', icon: TrendingUp   },
            { label: 'Combined Expenses', value: dashboard.combined.expenses, color: 'var(--red)',   icon: TrendingDown },
            { label: 'Net Savings',       value: dashboard.combined.net,      color: dashboard.combined.net >= 0 ? 'var(--text)' : 'var(--red)', icon: dashboard.combined.net >= 0 ? TrendingUp : TrendingDown },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                ₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member cards */}
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
        Members this month
      </div>

      {dl ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {[...Array(2)].map((_, i) => <div key={i} className="n-skeleton" style={{ height: '180px', borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : dashboard?.memberData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {dashboard.memberData.map(md => (
            <MemberCard key={md.member.id} data={md} isOwner={md.member.id === (family.createdBy?._id || family.createdBy)} />
          ))}
        </div>
      ) : null}

      {/* Members list */}
      <div style={{ marginTop: '24px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>All members ({family.members?.length})</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Invite code: <strong style={{ letterSpacing: '0.1em' }}>{family.inviteCode}</strong></span>
        </div>
        {family.members?.map(m => (
          <div key={m._id || m} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <MemberAvatar username={m.username || '?'} isOwner={(m._id || m) === (family.createdBy?._id || family.createdBy)} size={28} />
            <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{m.username || 'Member'}</span>
            {(m._id || m) === (family.createdBy?._id || family.createdBy) && (
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}><Crown size={10} /> Admin</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FamilyPage;
