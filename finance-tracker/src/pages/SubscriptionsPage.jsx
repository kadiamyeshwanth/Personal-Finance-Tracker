import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RefreshCcw, Plus, Trash2, Edit3, X, AlertCircle,
  CheckCircle2, PauseCircle, Bell, Calendar, TrendingDown,
} from 'lucide-react';
import { fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription } from '../api/subscriptions';
import PageHeader from '../components/ui/PageHeader';

// ── Known service logos (emoji map) ───────────────────────────────────────────
const SERVICE_LOGOS = {
  netflix: '🎬', spotify: '🎵', amazon: '📦', prime: '📦',
  youtube: '▶️', apple: '🍎', microsoft: '🪟', adobe: '🎨',
  notion: '📝', figma: '🎯', github: '🐙', slack: '💬',
  zoom: '📹', hotstar: '⭐', jio: '📡', airtel: '📶',
  default: '📋',
};

const getLogoEmoji = (name) => {
  const key = name.toLowerCase().split(' ')[0];
  return SERVICE_LOGOS[key] || SERVICE_LOGOS.default;
};

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: 'var(--green)',  bg: 'var(--green-bg)',  icon: CheckCircle2 },
  paused:    { label: 'Paused',    color: 'var(--yellow)', bg: 'var(--yellow-bg)', icon: PauseCircle  },
  cancelled: { label: 'Cancelled', color: 'var(--text-3)', bg: 'var(--bg-secondary)', icon: X        },
};

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
  { value: 'weekly',  label: 'Weekly' },
];

const EMPTY_FORM = { name: '', amount: '', billingCycle: 'monthly', category: 'Subscriptions', renewalDate: '', status: 'active', notes: '' };

// ── Sub card ──────────────────────────────────────────────────────────────────
const SubCard = ({ sub, onEdit, onDelete }) => {
  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
  const StatusIcon = cfg.icon;
  const urgent = sub.daysUntilRenewal != null && sub.daysUntilRenewal <= 7 && sub.status === 'active';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ borderColor: 'var(--border-strong)' }}
      style={{
        border: `1px solid ${urgent ? 'rgba(196,85,77,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--r-md)', padding: '16px 18px',
        background: sub.status === 'cancelled' ? 'var(--bg-secondary)' : 'var(--bg)',
        opacity: sub.status === 'cancelled' ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: 'var(--r-md)', flexShrink: 0,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>
          {getLogoEmoji(sub.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{sub.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: cfg.bg, color: cfg.color, fontWeight: 500 }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{sub.category}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }}
            onClick={() => onEdit(sub)}
            className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px', color: 'var(--text-3)' }}>
            <Edit3 size={13} />
          </motion.button>
          <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
            onClick={() => onDelete(sub)}
            className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px', color: 'var(--text-3)' }}>
            <Trash2 size={13} />
          </motion.button>
        </div>
      </div>

      {/* Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            ₹{sub.amount.toLocaleString('en-IN')}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '4px' }}>/ {sub.billingCycle}</span>
        </div>
        {sub.billingCycle !== 'monthly' && (
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            ≈ ₹{sub.monthlyEquivalent?.toLocaleString('en-IN')}/mo
          </span>
        )}
      </div>

      {/* Renewal */}
      {sub.renewalDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: urgent ? 'var(--red)' : 'var(--text-3)' }}>
          {urgent ? <AlertCircle size={12} /> : <Calendar size={12} />}
          <span>
            {sub.daysUntilRenewal != null && sub.daysUntilRenewal <= 0
              ? 'Renews today'
              : sub.daysUntilRenewal === 1
              ? 'Renews tomorrow'
              : sub.daysUntilRenewal != null && sub.daysUntilRenewal <= 7
              ? `Renews in ${sub.daysUntilRenewal} days`
              : `Renews ${new Date(sub.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            }
          </span>
        </div>
      )}
    </motion.div>
  );
};

// ── Form modal ────────────────────────────────────────────────────────────────
const SubForm = ({ initial = EMPTY_FORM, onSave, onClose, isPending }) => {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) { toast.error('Name and amount are required'); return; }
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="n-label">Service name</label>
          <input className="n-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Netflix, Spotify" required />
        </div>
        <div>
          <label className="n-label">Amount (₹)</label>
          <input className="n-input" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="199" required />
        </div>
        <div>
          <label className="n-label">Billing cycle</label>
          <select className="n-input" value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)}>
            {BILLING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="n-label">Category</label>
          <input className="n-input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Subscriptions" />
        </div>
        <div>
          <label className="n-label">Status</label>
          <select className="n-input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="n-label">Next renewal date</label>
          <input className="n-input" type="date" value={form.renewalDate} onChange={e => set('renewalDate', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} className="n-btn n-btn-default n-btn-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="n-btn n-btn-primary n-btn-sm">
          {isPending ? 'Saving…' : 'Save subscription'}
        </button>
      </div>
    </form>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const SubscriptionsPage = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: res = { data: [], monthlyTotal: 0, yearlyTotal: 0 }, isLoading } =
    useQuery({ queryKey: ['subscriptions'], queryFn: fetchSubscriptions });

  const { data: subs, monthlyTotal, yearlyTotal } = res;

  const addMut = useMutation({
    mutationFn: addSubscription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Subscription added'); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to add'),
  });
  const updateMut = useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Updated'); setEditing(null); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to update'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const activeSubs = subs?.filter(s => s.status === 'active') || [];
  const renewingSoon = activeSubs.filter(s => s.daysUntilRenewal != null && s.daysUntilRenewal <= 7);

  return (
    <div>
      <PageHeader
        icon={RefreshCcw}
        title="Subscriptions"
        subtitle="Track your recurring services and memberships."
        action={
          <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
            className="n-btn n-btn-primary n-btn-sm" onClick={() => { setEditing(null); setShowForm(p => !p); }}>
            <Plus size={13} /> Add subscription
          </motion.button>
        }
      />

      {/* Summary bar */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Monthly cost',    value: `₹${monthlyTotal?.toLocaleString('en-IN')}`, sub: `${activeSubs.length} active` },
            { label: 'Yearly cost',     value: `₹${yearlyTotal?.toLocaleString('en-IN')}`,  sub: 'Projected total' },
            { label: 'Renewing soon',   value: renewingSoon.length,                         sub: 'Within 7 days', alert: renewingSoon.length > 0 },
          ].map(({ label, value, sub, alert }) => (
            <div key={label} style={{ padding: '16px 18px', border: `1px solid ${alert ? 'rgba(196,85,77,0.25)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', background: alert ? 'rgba(196,85,77,0.03)' : 'var(--bg)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: alert ? 'var(--red)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', marginBottom: '24px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  {editing ? `Edit ${editing.name}` : 'New subscription'}
                </span>
                <button className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '3px' }}
                  onClick={() => { setShowForm(false); setEditing(null); }}><X size={14} /></button>
              </div>
              <SubForm
                initial={editing || EMPTY_FORM}
                onSave={editing
                  ? (data) => updateMut.mutate({ id: editing.id, ...data })
                  : (data) => addMut.mutate(data)
                }
                onClose={() => { setShowForm(false); setEditing(null); }}
                isPending={addMut.isPending || updateMut.isPending}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} className="n-card" style={{ height: '140px', padding: '16px' }}><div className="n-skeleton" style={{ height: '100%' }} /></div>)}
        </div>
      ) : subs?.length === 0 ? (
        <div className="n-empty">
          <div className="n-empty-icon"><RefreshCcw size={28} strokeWidth={1.2} /></div>
          <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No subscriptions yet</p>
          <p style={{ fontSize: '13px' }}>Add Netflix, Spotify, and other recurring services.</p>
          <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>
            <Plus size={12} /> Add subscription
          </button>
        </div>
      ) : (
        <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
          <AnimatePresence>
            {subs.map(sub => (
              <SubCard key={sub.id} sub={sub}
                onEdit={(s) => { setEditing({ ...s, renewalDate: s.renewalDate ? new Date(s.renewalDate).toISOString().split('T')[0] : '' }); setShowForm(false); }}
                onDelete={(s) => { if (confirm(`Delete "${s.name}"?`)) deleteMut.mutate(s.id); }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
