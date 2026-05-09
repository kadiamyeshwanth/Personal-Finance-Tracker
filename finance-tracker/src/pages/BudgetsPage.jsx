import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wallet, X } from 'lucide-react';
import { fetchBudgets, saveBudget, deleteBudget } from '../api/budgets';
import { fetchTransactions } from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import PageHeader from '../components/ui/PageHeader';

const BudgetsPage = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], limit: '' });

  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });
  const { data: allTxns = [] }                = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const expenses = allTxns.filter(t => !t.isRecurring && t.type === 'expense');

  const saveMut = useMutation({
    mutationFn: saveBudget,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget saved'); setForm({ category: EXPENSE_CATEGORIES[0], limit: '' }); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to save'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.limit || parseFloat(form.limit) <= 0) { toast.error('Enter a valid limit'); return; }
    saveMut.mutate({ username: currentUser.username, category: form.category, limit: parseFloat(form.limit) });
  };

  const enriched = useMemo(() => {
    const spendMap = expenses.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    return budgets.map(b => ({ ...b, spent: spendMap[b.category] || 0, pct: ((spendMap[b.category] || 0) / b.limit) * 100 }));
  }, [budgets, expenses]);

  return (
    <div>
      <PageHeader
        icon={Wallet}
        title="Budgets"
        subtitle="Set monthly spending limits and track your usage."
        action={
          <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
            className="n-btn n-btn-primary n-btn-sm"
            onClick={() => setShowForm(p => !p)}
          >
            <Plus size={13} /> Set budget
          </motion.button>
        }
      />

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', marginBottom: '24px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Set or update a budget</span>
                <button onClick={() => setShowForm(false)} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '3px' }}><X size={14} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="n-label">Category</label>
                    <select className="n-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="n-label">Monthly limit (₹)</label>
                    <input className="n-input" type="number" min="1" placeholder="e.g. 5,000" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={saveMut.isPending} className="n-btn n-btn-primary n-btn-sm">
                    {saveMut.isPending ? 'Saving…' : 'Save budget'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="n-btn n-btn-default n-btn-sm">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget list */}
      {bl ? (
        <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading…</div>
      ) : enriched.length === 0 ? (
        <div className="n-empty">
          <div className="n-empty-icon"><Wallet size={28} strokeWidth={1.2} /></div>
          <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No budgets set</p>
          <p style={{ fontSize: '13px' }}>Create a budget to track your spending limits.</p>
          <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>
            <Plus size={12} /> Set budget
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          {enriched.map((b, idx) => {
            const over = b.pct >= 100;
            const warn = b.pct >= 80 && !over;
            const barColor = over ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
            const statusText = over ? 'Over budget' : warn ? 'Near limit' : 'On track';
            const statusColor = over ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
            const statusTag = over ? 'red' : warn ? 'yellow' : 'green';

            return (
              <motion.div
                key={b.id}
                whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '20px',
                  padding: '14px 16px',
                  borderBottom: idx < enriched.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'var(--bg)',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ width: '130px', flexShrink: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text)', marginBottom: '1px' }}>{b.category}</div>
                  <span className={`n-tag n-tag-${statusTag}`} style={{ fontSize: '11px' }}>{statusText}</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div className="n-progress-track">
                    <motion.div
                      className="n-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(b.pct, 100)}%` }}
                      transition={{ duration: 0.7, ease: [0.4,0,0.2,1] }}
                      style={{ background: barColor }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '160px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 600, color: over ? 'var(--red)' : 'var(--text)' }}>₹{b.spent.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--text-3)' }}> / ₹{b.limit.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{b.pct.toFixed(0)}% used</div>
                </div>

                <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                  onClick={() => { if (confirm(`Delete budget for "${b.category}"?`)) deleteMut.mutate(b.id); }}
                  className="n-btn n-btn-ghost n-btn-sm" style={{ color: 'var(--text-3)', padding: '4px', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
