/**
 * FamilyPage — Shared family finance dashboard
 * Create or join a family group, view combined spending,
 * per-member breakdowns, and shared categories.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersThree as Users,
  Plus as Plus,
  SignIn as LogIn,
  Copy as Copy,
  CheckCircle as CheckCircle2,
  Trash as Trash2,
  TrendUp as TrendingUp,
  TrendDown as TrendingDown,
  ArrowRight as ArrowRight,
  Crown as Crown,
  UserMinus as UserMinus,
} from '@phosphor-icons/react';
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
  const colors = ['var(--brand)', 'var(--brand)', 'var(--brand)', 'var(--red)', 'var(--red)', 'var(--brand)'];
  const color = colors[username?.charCodeAt(0) % colors.length];
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '6px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
        {username?.[0]?.toUpperCase()}
      </div>
      {isOwner && (
        <div style={{ position: 'absolute', bottom: -3, right: -3, background: 'var(--red)', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          {isOwner && <Crown size={11} style={{ color: 'var(--red)' }} />}
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); toast.success('Family group created'); onDone(); },
    onError: e  => toast.error(e.response?.data?.error || 'Failed to create'),
  });

  const joinMut = useMutation({
    mutationFn: () => joinFamily(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['family'] }); toast.success('Joined family'); onDone(); },
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
              style={{ flex: 1, padding: '10px', border: 'none', background: tab === t ? 'var(--bg)' : 'var(--bg-secondary)', fontSize: '13px', fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--text)' : 'var(--text-3)', borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent', cursor: 'pointer' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '28px', alignItems: 'start' }}>
          {/* Left — pitch + actions */}
          <div>
            <div style={{
              position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', padding: '28px',
              background: 'linear-gradient(140deg, #1A1420 0%, #2A1508 50%, #E85002 150%)', color: '#fff',
              boxShadow: '0 20px 56px rgba(232,80,2,0.22)', marginBottom: '18px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '10px' }}>Shared, not merged</div>
              <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.15, marginBottom: '10px' }}>One combined view. Everyone keeps their own account.</div>
              <div style={{ fontSize: '14px', opacity: 0.78, lineHeight: 1.6 }}>Create a group, share the invite code, and see this month's household income, spending and per-member breakdown in one place.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { icon: TrendingUp, t: 'Combined totals', d: 'Household income, expenses and net savings, updated live.' },
                { icon: Users, t: 'Per-member breakdown', d: "Each person's spend and top categories — without sharing logins." },
                { icon: Crown, t: 'You stay in control', d: 'The group owner manages members; anyone can leave anytime.' },
              ].map(({ icon: Ic, t, d }) => (
                <div key={t} style={{ display: 'flex', gap: '12px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)' }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '9px', background: 'var(--brand-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic size={17} weight="fill" style={{ color: 'var(--brand)' }} />
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5, marginTop: '2px' }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="n-btn n-btn-primary" onClick={() => setShowSetup(true)}><Plus size={14} weight="bold" /> Create a group</button>
              <button className="n-btn n-btn-default" onClick={() => setShowSetup(true)}><LogIn size={14} weight="fill" /> Join with a code</button>
            </div>
          </div>

          {/* Right — faux preview of the shared dashboard */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
              Preview · The Sharma Family
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[['Income', '₹1,84,000', 'var(--green)'], ['Spent', '₹1,12,400', 'var(--red)'], ['Net', '₹71,600', 'var(--brand)']].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{l}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
              {[['Aditi', 62, 'var(--brand)'], ['Rohan', 44, '#FF8A3D'], ['Priya', 28, '#C94F00']].map(([n, w, c]) => (
                <div key={n} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)', marginBottom: '4px' }}>
                    <span>{n}</span><span style={{ color: 'var(--text-3)' }}>₹{(w * 620).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: '999px', background: 'var(--border-strong)', overflow: 'hidden' }}>
                    <div style={{ width: `${w}%`, height: '100%', borderRadius: '999px', background: c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}><Crown size={10} /> Admin</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FamilyPage;
