import React, { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Search, SlidersHorizontal, CreditCard, ChevronDown, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { fetchTransactionsPaged, addTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { useAuth } from '../context/AuthContext';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories';
import PageHeader from '../components/ui/PageHeader';

const LIMIT = 25;
const BLANK = {
  type: 'expense',
  category: EXPENSE_CATEGORIES[0],
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  isRecurring: false,
  frequency: 'monthly',
};

/** Clickable sortable column header */
const SortHeader = ({ label, field, sort, onSort, style }) => {
  const active = sort.field === field;
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      onClick={() => onSort(field)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: active ? 'var(--text)' : 'var(--text-3)' }}>
        {label}
        {active
          ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
          : <ArrowUpDown size={11} style={{ opacity: 0.4 }} />}
      </span>
    </th>
  );
};

const TransactionsPage = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  const [form, setForm]           = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState({ field: 'date', dir: 'desc' });

  const handleSort = useCallback((field) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
    qc.removeQueries({ queryKey: ['transactions-paged'] });
  }, [qc]);

  // ── Infinite scroll / Load More query ─────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['transactions-paged', filters, sort],
    queryFn: ({ pageParam = 1 }) =>
      fetchTransactionsPaged({ page: pageParam, limit: LIMIT, ...filters, sortField: sort.field, sortDir: sort.dir }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  // Flatten all pages into a single list
  const txns = (data?.pages ?? []).flatMap(p => p.data);
  const total = data?.pages?.[0]?.total ?? 0;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['transactions-paged'] });

  const addMut = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['transactions'] }); toast.success('Transaction added'); reset(); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to add'),
  });
  const updateMut = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['transactions'] }); toast.success('Updated'); reset(); },
    onError: () => toast.error('Failed to update'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['transactions'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const reset = () => { setForm(BLANK); setEditingId(null); setShowForm(false); };

  const handleEdit = t => {
    setEditingId(t.id);
    setForm({ type: t.type, category: t.category, amount: String(t.amount), date: t.date, description: t.description || '', isRecurring: !!t.isRecurring, frequency: t.frequency || 'monthly' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    const payload = { ...form, amount: parseFloat(form.amount), username: currentUser.username };
    editingId ? updateMut.mutate({ id: editingId, ...payload }) : addMut.mutate(payload);
  };

  const applyFilters = newFilters => {
    setFilters(newFilters);
    // Reset to page 1 by invalidating the paged query
    qc.removeQueries({ queryKey: ['transactions-paged'] });
  };

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isSaving = addMut.isPending || updateMut.isPending;

  return (
    <div>
      <PageHeader
        icon={CreditCard}
        title="Transactions"
        subtitle={isLoading ? 'Loading…' : `${total} transaction${total !== 1 ? 's' : ''} total`}
        action={
          <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
            className="n-btn n-btn-primary n-btn-sm"
            onClick={() => { reset(); setShowForm(p => !p); }}
          >
            <Plus size={13} /> New transaction
          </motion.button>
        }
      />

      {/* Inline form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', marginBottom: '24px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                  {editingId ? 'Edit transaction' : 'New transaction'}
                </span>
                <button onClick={reset} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px' }}>
                  <X size={15} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="n-label">Type</label>
                    <select className="n-select" style={{ height: '34px' }} value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value, category: (e.target.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] })}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="n-label">Category</label>
                    <select className="n-select" style={{ height: '34px' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="n-label">Amount (₹)</label>
                    <input className="n-input" style={{ height: '34px' }} type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div>
                    <label className="n-label">Date</label>
                    <input className="n-input" style={{ height: '34px' }} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="n-label">Description</label>
                    <input className="n-input" style={{ height: '34px' }} type="text" placeholder="What was this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', marginBottom: '14px' }}>
                  <input type="checkbox" checked={form.isRecurring} disabled={!!editingId} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
                  Recurring transaction
                </label>
                {form.isRecurring && !editingId && (
                  <div style={{ marginBottom: '14px' }}>
                    <label className="n-label">Frequency</label>
                    <select className="n-select" style={{ width: '160px', height: '34px' }} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={isSaving} className="n-btn n-btn-primary n-btn-sm">
                    {isSaving ? 'Saving…' : (editingId ? 'Update' : 'Add transaction')}
                  </button>
                  <button type="button" onClick={reset} className="n-btn n-btn-default n-btn-sm">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', padding: '0 10px', height: '32px', minWidth: '180px' }}>
          <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input value={filters.search} onChange={e => applyFilters({ ...filters, search: e.target.value })}
            placeholder="Search descriptions, categories…"
            style={{ border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text)', background: 'transparent', flex: 1 }}
          />
          {isFetching && !isLoading && <Loader2 size={12} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />}
        </div>
        <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={() => setShowFilters(p => !p)}
          className={`n-btn n-btn-sm ${showFilters ? 'n-btn-primary' : 'n-btn-default'}`} style={{ gap: '5px', height: '32px' }}>
          <SlidersHorizontal size={13} /> Filters
        </motion.button>
        <select className="n-select" style={{ width: 'auto', height: '32px', fontSize: '13px' }}
          value={filters.type} onChange={e => applyFilters({ ...filters, type: e.target.value })}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Expanded filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', background: 'var(--bg-secondary)' }}>
              <div>
                <label className="n-label">Category</label>
                <select className="n-select" style={{ height: '32px', fontSize: '13px' }} value={filters.category} onChange={e => applyFilters({ ...filters, category: e.target.value })}>
                  <option value="all">All categories</option>
                  {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="n-label">From</label>
                <input className="n-input" style={{ height: '32px' }} type="date" value={filters.dateFrom} onChange={e => applyFilters({ ...filters, dateFrom: e.target.value })} />
              </div>
              <div>
                <label className="n-label">To</label>
                <input className="n-input" style={{ height: '32px' }} type="date" value={filters.dateTo} onChange={e => applyFilters({ ...filters, dateTo: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="n-btn n-btn-ghost n-btn-sm"
                  onClick={() => applyFilters({ type: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' })}>
                  <X size={12} /> Clear filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {isLoading ? 'Loading…' : `Showing ${txns.length} of ${total} transactions`}
          </span>
          {(filters.type !== 'all' || filters.category !== 'all' || filters.search || filters.dateFrom || filters.dateTo) && (
            <span style={{ fontSize: '12px', color: 'var(--accent)' }}>Filters active</span>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
            Loading transactions…
          </div>
        ) : txns.length === 0 ? (
          <div className="n-empty">
            <div className="n-empty-icon"><CreditCard size={26} strokeWidth={1.2} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No transactions found</p>
            <p style={{ fontSize: '13px' }}>Add one or adjust your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="n-table">
              <thead>
                <tr>
                  <SortHeader label="Date"     field="date"     sort={sort} onSort={handleSort} />
                  <th>Type</th>
                  <SortHeader label="Category" field="category" sort={sort} onSort={handleSort} />
                  <th>Description</th>
                  <SortHeader label="Amount"   field="amount"   sort={sort} onSort={handleSort} style={{ textAlign: 'right' }} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`n-tag n-tag-${t.type === 'income' ? 'green' : 'red'}`}>{t.type}</span>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{t.category}</td>
                    <td style={{ color: 'var(--text-3)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {t.type === 'income' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={() => handleEdit(t)}
                          className="n-btn n-btn-ghost n-btn-sm" style={{ color: 'var(--text-3)', padding: '4px 7px' }}>
                          <Pencil size={12} />
                        </motion.button>
                        <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                          onClick={() => { if (confirm('Delete this transaction?')) deleteMut.mutate(t.id); }}
                          className="n-btn n-btn-ghost n-btn-sm" style={{ color: 'var(--text-3)', padding: '4px 7px' }}
                          disabled={deleteMut.isPending}>
                          <Trash2 size={12} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More button */}
        {hasNextPage && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <motion.button
              whileHover={{ backgroundColor: 'var(--bg-hover)' }}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="n-btn n-btn-default n-btn-sm"
              style={{ gap: '6px' }}
            >
              {isFetchingNextPage ? (
                <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading more…</>
              ) : (
                <><ChevronDown size={13} /> Load more ({total - txns.length} remaining)</>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
