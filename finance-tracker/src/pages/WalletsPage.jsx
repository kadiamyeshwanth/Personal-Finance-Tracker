import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wallet, Plus, Trash2, Edit3, X, Star, TrendingUp } from 'lucide-react';
import { fetchWallets, addWallet, updateWallet, deleteWallet } from '../api/wallets';
import { fetchTransactions } from '../api/transactions';
import PageHeader from '../components/ui/PageHeader';

const WALLET_TYPES = [
  { value: 'cash',       label: 'Cash',        icon: '💵' },
  { value: 'bank',       label: 'Bank Account', icon: '🏦' },
  { value: 'savings',    label: 'Savings',      icon: '🏧' },
  { value: 'credit',     label: 'Credit Card',  icon: '💳' },
  { value: 'investment', label: 'Investment',   icon: '📈' },
];

const WALLET_COLORS = ['#2383e2','#0f7b6c','#9065b0','#d9730d','#c4554d','#6366f1','#14b8a6','#84cc16'];

const getTypeConfig = (type) => WALLET_TYPES.find(t => t.value === type) || WALLET_TYPES[1];

const EMPTY_FORM = { name: '', type: 'bank', balance: '', currency: 'INR', color: '#2383e2', isDefault: false, notes: '' };

// ── Wallet card ───────────────────────────────────────────────────────────────
const WalletCard = ({ wallet, onEdit, onDelete }) => {
  const typeConfig = getTypeConfig(wallet.type);
  const isPositive = wallet.balance >= 0;

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ borderColor: wallet.color }}
      style={{
        border: `1px solid var(--border)`, borderRadius: 'var(--r-md)',
        overflow: 'hidden', background: 'var(--bg)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Color accent top bar */}
      <div style={{ height: '4px', background: wallet.color }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>{typeConfig.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{wallet.name}</span>
                {wallet.isDefault && <Star size={11} fill="var(--yellow)" color="var(--yellow)" />}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{typeConfig.label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }}
              onClick={() => onEdit(wallet)} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px', color: 'var(--text-3)' }}>
              <Edit3 size={13} />
            </motion.button>
            <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
              onClick={() => onDelete(wallet)} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px', color: 'var(--text-3)' }}>
              <Trash2 size={13} />
            </motion.button>
          </div>
        </div>

        {/* Balance */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Current balance</div>
          <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: isPositive ? 'var(--text)' : 'var(--red)' }}>
            {!isPositive && '−'}₹{Math.abs(wallet.balance).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{wallet.currency}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Form ──────────────────────────────────────────────────────────────────────
const WalletForm = ({ initial = EMPTY_FORM, onSave, onClose, isPending }) => {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.name.trim()) { toast.error('Name required'); return; } onSave({ ...form, balance: parseFloat(form.balance) || 0 }); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="n-label">Account name</label>
          <input className="n-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HDFC Savings, Cash" required />
        </div>
        <div>
          <label className="n-label">Type</label>
          <select className="n-input" value={form.type} onChange={e => set('type', e.target.value)}>
            {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="n-label">Opening balance (₹)</label>
          <input className="n-input" type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="n-label">Card color</label>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {WALLET_COLORS.map(c => (
              <div key={c} onClick={() => set('color', c)} style={{
                width: '22px', height: '22px', borderRadius: '50%', background: c,
                cursor: 'pointer', border: form.color === c ? '2px solid var(--text)' : '2px solid transparent',
                outline: form.color === c ? '1px solid var(--text)' : 'none', outlineOffset: '2px',
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
          <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} />
          <label htmlFor="isDefault" style={{ fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>Set as default wallet</label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} className="n-btn n-btn-default n-btn-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="n-btn n-btn-primary n-btn-sm">
          {isPending ? 'Saving…' : 'Save wallet'}
        </button>
      </div>
    </form>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const WalletsPage = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: res = { data: [], totalBalance: 0 }, isLoading } =
    useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const { data: wallets, totalBalance } = res;

  const addMut = useMutation({
    mutationFn: addWallet,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallets'] }); toast.success('Wallet added'); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to add'),
  });
  const updateMut = useMutation({
    mutationFn: updateWallet,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallets'] }); toast.success('Updated'); setEditing(null); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to update'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallets'] }); toast.success('Wallet deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div>
      <PageHeader icon={Wallet} title="Wallets"
        subtitle="Manage your cash, bank accounts, and cards."
        action={
          <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
            className="n-btn n-btn-primary n-btn-sm" onClick={() => { setEditing(null); setShowForm(p => !p); }}>
            <Plus size={13} /> Add wallet
          </motion.button>
        }
      />

      {/* Total balance banner */}
      {!isLoading && wallets?.length > 0 && (
        <div style={{ padding: '20px 24px', marginBottom: '28px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Net worth across all wallets</div>
            <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', color: totalBalance >= 0 ? 'var(--text)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
              {totalBalance < 0 && '−'}₹{Math.abs(totalBalance).toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{wallets.length} account{wallets.length !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {wallets.filter(w => w.isDefault)[0]?.name && `Default: ${wallets.filter(w => w.isDefault)[0].name}`}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', marginBottom: '24px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  {editing ? `Edit ${editing.name}` : 'New wallet'}
                </span>
                <button className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '3px' }}
                  onClick={() => { setShowForm(false); setEditing(null); }}><X size={14} /></button>
              </div>
              <WalletForm
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

      {/* Cards grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '140px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' }}><div className="n-skeleton" style={{ height: '100%' }} /></div>)}
        </div>
      ) : wallets?.length === 0 ? (
        <div className="n-empty">
          <div className="n-empty-icon"><Wallet size={28} strokeWidth={1.2} /></div>
          <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No wallets yet</p>
          <p style={{ fontSize: '13px' }}>Add your bank accounts, cash, and credit cards.</p>
          <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>
            <Plus size={12} /> Add wallet
          </button>
        </div>
      ) : (
        <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '12px' }}>
          <AnimatePresence>
            {wallets.map(w => (
              <WalletCard key={w.id} wallet={w}
                onEdit={(wallet) => { setEditing(wallet); setShowForm(false); }}
                onDelete={(wallet) => { if (confirm(`Delete "${wallet.name}"?`)) deleteMut.mutate(wallet.id); }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default WalletsPage;
