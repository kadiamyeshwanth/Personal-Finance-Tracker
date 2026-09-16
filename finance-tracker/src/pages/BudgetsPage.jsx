import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorState, OfflineState } from '../components/ui/States';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus as Plus,
  Trash as Trash2,
  Wallet as Wallet,
  X as X,
} from '@phosphor-icons/react';
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

  let budgetsQ;
  const { data: budgets = [], isLoading: bl } = (budgetsQ = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets }));
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
      {/* A failed request must not look like an empty list. */}
      {budgetsQ?.isError && (
        navigator.onLine === false
          ? <OfflineState onRetry={() => budgetsQ.refetch()} compact />
          : <ErrorState error={budgetsQ.error} onRetry={() => budgetsQ.refetch()} compact />
      )}
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
            <div className="pg-form">
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
      ) : (enriched.length === 0 && !budgetsQ?.isError) ? (
        <div className="n-empty">
          <div className="n-empty-icon"><Wallet size={28} strokeWidth={1.2} /></div>
          <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No budgets set</p>
          <p style={{ fontSize: '13px' }}>Create a budget to track your spending limits.</p>
          <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>
            <Plus size={12} /> Set budget
          </button>
        </div>
      ) : (
        <div className="pg-list">
          {enriched.map((b, idx) => {
            const over = b.pct >= 100;
            const warn = b.pct >= 80 && !over;
            const barColor = over ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
            const statusText = over ? 'Over budget' : warn ? 'Near limit' : 'On track';
            const statusColor = over ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
            const statusTag = over ? 'red' : warn ? 'yellow' : 'green';

            /* instrument row (styles/instrument.css): name + mono status tag,
               the figures as a read-out, a ticked meter underneath */
            return (
              <div key={b.id} className={`bud-row${over ? ' is-over' : warn ? ' is-warn' : ''}`}>
                <div className="bud-top">
                  <span className="bud-name">{b.category}</span>
                  {/* only "over" carries colour — near-limit and on-track read neutral */}
                  <span className={`ins-tag${over ? ' ins-tag--red' : ''}`}>{statusText}</span>
                  <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                    onClick={() => { if (confirm(`Delete budget for "${b.category}"?`)) deleteMut.mutate(b.id); }}
                    className="n-btn n-btn-ghost n-btn-sm bud-del" aria-label={`Delete budget for ${b.category}`}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>

                <div className="bud-fig">
                  <span className="bud-spent">₹{b.spent.toLocaleString('en-IN')}</span>
                  <span className="bud-limit">/ ₹{b.limit.toLocaleString('en-IN')}</span>
                  <span className="bud-pct">{b.pct.toFixed(0)}%</span>
                </div>

                <div className="ins-meter ins-meter--thin" aria-hidden="true">
                  <motion.i
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.pct, 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    style={over ? { background: 'var(--red)' } : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
