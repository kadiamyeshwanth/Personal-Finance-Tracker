import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendUp as TrendingUp,
  Plus as Plus,
  Trash as Trash2,
  PencilSimple as Edit2,
  ArrowUpRight as ArrowUpRight,
  ArrowDownRight as ArrowDownRight,
  ChartPie as PieChart,
  Buildings as Building2,
  ChartLineUp, Bank, ArrowsClockwise, CurrencyBtc, Vault,
  ShieldCheck, Coins, House, Briefcase,
} from '@phosphor-icons/react';
import { fetchInvestments, addInvestment, updateInvestment, deleteInvestment } from '../api/investments';
import PageHeader from '../components/ui/PageHeader';
import BrandLogo from '../components/ui/BrandLogo';
import { queryStates } from '../components/ui/States';
import toast from 'react-hot-toast';

const TYPES = [
  { key: 'stocks',      label: 'Stocks',        Icon: ChartLineUp },
  { key: 'mutual_fund', label: 'Mutual Fund',   Icon: Bank },
  { key: 'sip',         label: 'SIP',           Icon: ArrowsClockwise },
  { key: 'crypto',      label: 'Crypto',        Icon: CurrencyBtc },
  { key: 'fd',          label: 'Fixed Deposit', Icon: Vault },
  { key: 'ppf',         label: 'PPF / NPS',     Icon: ShieldCheck },
  { key: 'gold',        label: 'Gold',          Icon: Coins },
  { key: 'real_estate', label: 'Real Estate',   Icon: House },
  { key: 'other',       label: 'Other',         Icon: Briefcase },
];

const COLORS = ['var(--brand)','var(--brand)','var(--brand)','var(--red)','var(--red)','var(--brand)','var(--brand)','var(--red)','var(--brand)'];
const fmt    = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const getType = (key) => TYPES.find(t => t.key === key) || TYPES[TYPES.length - 1];

const BLANK = { name: '', type: 'mutual_fund', investedAmount: '', currentValue: '', units: '', purchaseDate: new Date().toISOString().slice(0,10), notes: '', symbol: '', color: 'var(--brand)' };

const InvestmentsPage = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [filterType, setFilterType] = useState('all');

  const invQuery = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments });
  const { data: { data: investments = [], summary = {} } = {}, isLoading } = invQuery;

  const addMut = useMutation({
    mutationFn: addInvestment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); setShowForm(false); setForm(BLANK); toast.success('Investment added!'); },
    onError: e => toast.error(e.response?.data?.error || 'Failed.'),
  });
  const updMut = useMutation({
    mutationFn: ({ id, data }) => updateInvestment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); setEditing(null); setShowForm(false); toast.success('Updated!'); },
  });
  const delMut = useMutation({
    mutationFn: deleteInvestment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); toast.success('Deleted.'); },
  });

  const handleSave = () => {
    if (!form.name || !form.investedAmount) return toast.error('Name and invested amount required.');
    const data = { ...form, investedAmount: Number(form.investedAmount), currentValue: Number(form.currentValue || form.investedAmount), units: Number(form.units || 0) };
    if (editing) updMut.mutate({ id: editing, data });
    else addMut.mutate(data);
  };

  const openEdit = (inv) => {
    setEditing(inv._id);
    setForm({ name: inv.name, type: inv.type, investedAmount: inv.investedAmount, currentValue: inv.currentValue, units: inv.units || 0, purchaseDate: new Date(inv.purchaseDate).toISOString().slice(0,10), notes: inv.notes, symbol: inv.symbol, color: inv.color });
    setShowForm(true);
  };

  const filtered = filterType === 'all' ? investments : investments.filter(i => i.type === filterType);

  const pnlColor = (pnl) => pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-3)';

  // Portfolio breakdown by type
  const typeBreakdown = TYPES.map(t => {
    const inv = investments.filter(i => i.type === t.key);
    return { ...t, invested: inv.reduce((s, i) => s + i.investedAmount, 0), current: inv.reduce((s, i) => s + (i.currentValue || i.investedAmount), 0) };
  }).filter(t => t.invested > 0);

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Investments" subtitle="Track your portfolio — stocks, MFs, SIPs, crypto, FDs and more.">
        <button className="n-btn n-btn-primary n-btn-sm" onClick={() => { setEditing(null); setForm(BLANK); setShowForm(true); }}>
          <Plus size={14} /> Add Investment
        </button>
      </PageHeader>

      {queryStates({
        query: invQuery,
        isEmpty: !isLoading && investments.length === 0,
        label: 'Loading your portfolio',
        empty: {
          icon: <ChartLineUp size={26} weight="fill" />,
          title: 'No investments yet',
          body: 'Track stocks, mutual funds, SIPs, crypto, FDs and gold in one place.',
          action: <button className="n-btn n-btn-primary n-btn-sm" onClick={() => { setEditing(null); setForm(BLANK); setShowForm(true); }}><Plus size={14} weight="bold" /> Add your first holding</button>,
        },
      }) || (
      <>

      {/* Summary cards */}
      {investments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Invested', value: fmt(summary.totalInvested), color: 'var(--text)', icon: Building2 },
            { label: 'Current Value', value: fmt(summary.totalCurrent),   color: 'var(--text)', icon: PieChart  },
            { label: 'Total P&L',     value: `${summary.totalPnL >= 0 ? '+' : ''}${fmt(summary.totalPnL)}`, color: pnlColor(summary.totalPnL), icon: summary.totalPnL >= 0 ? ArrowUpRight : ArrowDownRight },
            { label: 'Returns',       value: `${summary.totalPnL >= 0 ? '+' : ''}${summary.totalPnLPct}%`, color: pnlColor(summary.totalPnL), icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Icon size={13} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px', alignItems: 'start' }}>
        {/* Investment list */}
        <div>
          {/* Filter tabs */}
          {investments.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => setFilterType('all')} style={{ padding: '5px 11px', borderRadius: '999px', border: `1px solid ${filterType === 'all' ? 'var(--brand)' : 'var(--border)'}`, background: filterType === 'all' ? 'var(--brand-bg)' : 'var(--bg)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: filterType === 'all' ? 'var(--brand)' : 'var(--text-2)' }}>All</button>
              {TYPES.filter(t => investments.some(i => i.type === t.key)).map(t => (
                <button key={t.key} onClick={() => setFilterType(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '999px', border: `1px solid ${filterType === t.key ? 'var(--brand)' : 'var(--border)'}`, background: filterType === t.key ? 'var(--brand-bg)' : 'var(--bg)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: filterType === t.key ? 'var(--brand)' : 'var(--text-2)' }}>
                  <t.Icon size={13} weight="fill" /> {t.label}
                </button>
              ))}
            </div>
          )}

          {isLoading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div> :
           filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <span style={{ width: 44, height: 44, borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-bg)', marginBottom: '14px' }}>
                <ChartLineUp size={22} weight="fill" style={{ color: 'var(--brand)' }} />
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No investments yet</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>Start tracking your portfolio — stocks, mutual funds, SIPs, FDs and more.</div>
              <button className="n-btn n-btn-primary n-btn-sm" onClick={() => { setEditing(null); setForm(BLANK); setShowForm(true); }}><Plus size={14} /> Add first investment</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((inv, i) => {
                const t   = getType(inv.type);
                const pnl = (inv.currentValue || inv.investedAmount) - inv.investedAmount;
                const pct = inv.investedAmount > 0 ? ((pnl / inv.investedAmount) * 100).toFixed(1) : 0;
                return (
                  <motion.div key={inv._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <BrandLogo name={inv.name} symbol={inv.symbol} type={inv.type} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {inv.name} {inv.symbol && <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border)' }}>{inv.symbol}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                        {t.label} · {new Date(inv.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.units > 0 && ` · ${inv.units} units`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{fmt(inv.currentValue || inv.investedAmount)}</div>
                      <div style={{ fontSize: '12px', color: pnlColor(pnl) }}>
                        {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnl >= 0 ? '+' : ''}{pct}%)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>invested: {fmt(inv.investedAmount)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(inv)} className="n-btn n-btn-default n-btn-sm" style={{ padding: '4px 8px' }}><Edit2 size={12} /></button>
                      <button onClick={() => delMut.mutate(inv._id)} className="n-btn n-btn-danger-ghost n-btn-sm" style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Portfolio breakdown */}
        {typeBreakdown.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Portfolio Breakdown</span>
            </div>
            <div style={{ padding: '8px' }}>
              {typeBreakdown.map(t => {
                const pct = summary.totalInvested > 0 ? Math.round((t.invested / summary.totalInvested) * 100) : 0;
                const pnl = t.current - t.invested;
                return (
                  <div key={t.key} style={{ padding: '10px 8px', borderRadius: 'var(--r)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}><t.Icon size={13} weight="fill" /> {t.label}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fmt(t.invested)}</span>
                      <span style={{ fontSize: '11px', color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowForm(false); setEditing(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: '480px', maxWidth: 'calc(100vw - 32px)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{editing ? 'Edit Investment' : 'Add Investment'}</span>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Name *</label>
                    <input className="n-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Axis Bluechip Fund" style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Symbol / Ticker</label>
                    <input className="n-input" value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="e.g. RELIANCE" style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Type</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {TYPES.map(t => (
                      <button key={t.key} onClick={() => setForm(p => ({ ...p, type: t.key }))}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '999px', border: `1px solid ${form.type === t.key ? 'var(--brand)' : 'var(--border)'}`, background: form.type === t.key ? 'var(--brand-bg)' : 'var(--bg)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: form.type === t.key ? 'var(--brand)' : 'var(--text-2)' }}>
                        <t.Icon size={13} weight="fill" /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Invested (₹) *</label>
                    <input type="number" className="n-input" value={form.investedAmount} onChange={e => setForm(p => ({ ...p, investedAmount: e.target.value }))} placeholder="0" style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Current Value (₹)</label>
                    <input type="number" className="n-input" value={form.currentValue} onChange={e => setForm(p => ({ ...p, currentValue: e.target.value }))} placeholder="Same as invested" style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Units</label>
                    <input type="number" className="n-input" value={form.units} onChange={e => setForm(p => ({ ...p, units: e.target.value }))} placeholder="0" style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Purchase Date</label>
                    <input type="date" className="n-input" value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} style={{ width: '100%', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Color</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                          style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Notes</label>
                  <input className="n-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" style={{ width: '100%', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <button className="n-btn n-btn-default n-btn-sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                  <button className="n-btn n-btn-primary n-btn-sm" onClick={handleSave} disabled={addMut.isPending || updMut.isPending}>
                    {addMut.isPending || updMut.isPending ? 'Saving…' : editing ? 'Update' : 'Add Investment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvestmentsPage;
