import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Wallet as Wallet,
  Plus as Plus,
  Trash as Trash2,
  PencilSimple as Edit3,
  X as X,
  Star as Star,
  TrendUp as TrendingUp,
} from '@phosphor-icons/react';
import { fetchWallets, addWallet, updateWallet, deleteWallet } from '../api/wallets';
import { fetchTransactions } from '../api/transactions';
import PageHeader from '../components/ui/PageHeader';
import BrandLogo from '../components/ui/BrandLogo';
import FloatingPaths from '../components/ui/FloatingPaths';
import { queryStates } from '../components/ui/States';

const WALLET_TYPES = [
  { value: 'cash',       label: 'Cash' },
  { value: 'bank',       label: 'Bank Account' },
  { value: 'savings',    label: 'Savings' },
  { value: 'credit',     label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
];

const WALLET_COLORS = ['var(--brand)','var(--brand)','var(--brand)','var(--red)','var(--red)','var(--brand)','var(--brand)','var(--brand)'];

const getTypeConfig = (type) => WALLET_TYPES.find(t => t.value === type) || WALLET_TYPES[1];

const EMPTY_FORM = { name: '', type: 'bank', balance: '', currency: 'INR', color: 'var(--brand)', isDefault: false, notes: '' };

// ── Wallet card ───────────────────────────────────────────────────────────────
const WalletCard = ({ wallet, onEdit, onDelete }) => {
  const typeConfig = getTypeConfig(wallet.type);
  const isPositive = wallet.balance >= 0;

  return (
    <motion.div
      className="wcard"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ rotateX: 3.5, rotateY: -6, y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ transformPerspective: 1100 }}
    >
      <span className="wcard-sheen" aria-hidden="true" />
      <div style={{ padding: '18px 18px 16px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrandLogo name={wallet.name} type={wallet.type} size={38} />
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
            {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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

  const walletsQuery = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const { data: res = { data: [], totalBalance: 0 }, isLoading } = walletsQuery;
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
        <div className="wal-networth" style={{ padding: '22px 26px', marginBottom: '28px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
          <FloatingPaths className="tile-fp" />
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Net worth across all wallets</div>
            <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', color: totalBalance >= 0 ? 'var(--text)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
              {totalBalance < 0 && '−'}₹{Math.abs(totalBalance).toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', position: 'relative', zIndex: 1 }}>
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
      {queryStates({
        query: walletsQuery,
        isEmpty: !isLoading && (wallets?.length === 0),
        label: 'Loading your accounts',
        empty: {
          icon: <Wallet size={26} weight="fill" />,
          title: 'No wallets yet',
          body: 'Add your bank accounts, cash and credit cards to see your net worth.',
          action: <button className="n-btn n-btn-primary n-btn-sm" onClick={() => setShowForm(true)}><Plus size={13} weight="bold" /> Add wallet</button>,
        },
      }) || (
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
