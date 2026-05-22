/**
 * TransactionsPage — Full-featured transaction manager.
 * Includes: merchant field, tags, AI category auto-suggest,
 * fraud flag badges, CSV import, receipt scanner trigger,
 * sortable table, infinite scroll load-more, and filter panel.
 */
import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, X, Search, SlidersHorizontal,
  CreditCard, ChevronDown, Loader2, ArrowUp, ArrowDown,
  ArrowUpDown, AlertTriangle, Upload, Camera, Tag, Store,
  Sparkles, RefreshCw, FileText, MessageSquare,
} from 'lucide-react';
import { fetchTransactionsPaged, addTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { fetchCategories } from '../api/categories';
import { useAuth } from '../context/AuthContext';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories';
import PageHeader from '../components/ui/PageHeader';
import CSVImportModal from '../components/ui/CSVImportModal';
import ReceiptScannerModal from '../components/ui/ReceiptScannerModal';
import SMSImportModal from '../components/ui/SMSImportModal';
import client from '../api/client';

const LIMIT = 25;

const BLANK = {
  type: 'expense',
  category: EXPENSE_CATEGORIES[0],
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  merchant: '',
  tags: '',          // comma-separated string in form, array on submit
  isRecurring: false,
  frequency: 'monthly',
};

// ── Flag badge tooltip ───────────────────────────────────────────────────────
const FLAG_LABELS = {
  duplicate:     '⚠️ Possible duplicate transaction',
  abnormal:      '📈 Unusually high for this category',
  'late-night':  '🌙 Late-night transaction',
  impulse:       '⚡ Possible impulse purchase',
};

const FlagBadge = ({ flags = [] }) => {
  if (!flags.length) return null;
  const tip = flags.map(f => FLAG_LABELS[f] || f).join(' · ');
  return (
    <span title={tip} style={{
      display: 'inline-flex', alignItems: 'center',
      color: 'var(--yellow)', cursor: 'help', marginLeft: '4px',
    }}>
      <AlertTriangle size={11} strokeWidth={2} />
    </span>
  );
};

// ── Sortable column header ───────────────────────────────────────────────────
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

// ── Main Page ────────────────────────────────────────────────────────────────
const TransactionsPage = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  const [form, setForm]              = useState(BLANK);
  const [editingId, setEditingId]    = useState(null);
  const [showForm, setShowForm]      = useState(false);
  const [showFilters, setShowFilters]= useState(false);
  const [showCSV, setShowCSV]        = useState(false);
  const [showScanner, setShowScanner]= useState(false);
  const [showSMS, setShowSMS]        = useState(false);
  const [suggesting, setSuggesting]  = useState(false);        // category suggest loading
  const [filters, setFilters]        = useState({ type: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' });
  const [sort, setSort]              = useState({ field: 'date', dir: 'desc' });

  const handleSort = useCallback((field) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' }));
    qc.removeQueries({ queryKey: ['transactions-paged'] });
  }, [qc]);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery({
      queryKey: ['transactions-paged', filters, sort],
      queryFn: ({ pageParam = 1 }) =>
        fetchTransactionsPaged({ page: pageParam, limit: LIMIT, ...filters, sortField: sort.field, sortDir: sort.dir }),
      getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
      staleTime: 30_000,
    });

  // Custom categories from backend
  const { data: customCats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  const txns = (data?.pages ?? []).flatMap(p => p.data);
  const total = data?.pages?.[0]?.total ?? 0;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions-paged'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
  };

  const addMut    = useMutation({ mutationFn: addTransaction,    onSuccess: () => { invalidate(); toast.success('Transaction added'); reset(); }, onError: e => toast.error(e.response?.data?.error || 'Failed to add') });
  const updateMut = useMutation({ mutationFn: updateTransaction, onSuccess: () => { invalidate(); toast.success('Updated'); reset(); },           onError: () => toast.error('Failed to update') });
  const deleteMut = useMutation({ mutationFn: deleteTransaction, onSuccess: () => { invalidate(); toast.success('Deleted'); },                    onError: () => toast.error('Failed to delete') });

  const reset = () => { setForm(BLANK); setEditingId(null); setShowForm(false); };

  const handleEdit = (t) => {
    setEditingId(t.id || t._id);
    setForm({
      type:        t.type,
      category:    t.category,
      amount:      String(t.amount),
      date:        t.date?.split('T')[0] || t.date,
      description: t.description || '',
      merchant:    t.merchant || '',
      tags:        (t.tags || []).join(', '),
      isRecurring: !!t.isRecurring,
      frequency:   t.frequency || 'monthly',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    const tagsArr = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      tags: tagsArr,
      username: currentUser.username,
    };
    editingId ? updateMut.mutate({ id: editingId, ...payload }) : addMut.mutate(payload);
  };

  // ── AI Category Auto-suggest ─────────────────────────────────────────────────
  const suggestCategory = async (merchantName) => {
    if (!merchantName?.trim() || form.type !== 'expense') return;
    setSuggesting(true);
    try {
      const res = await client.post('/api/insights/suggest-category', { merchant: merchantName });
      if (res.data?.category) {
        setForm(f => ({ ...f, category: res.data.category }));
        toast.success(`Category auto-set: ${res.data.category}`, { icon: '✨' });
      }
    } catch { /* silent fail */ }
    finally { setSuggesting(false); }
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    qc.removeQueries({ queryKey: ['transactions-paged'] });
  };

  // Build category list: default + custom
  const defaultCats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const customForType = customCats.filter(c => !c.isDefault && (c.type === form.type || !c.type));
  const allCats = [...defaultCats, ...customForType.map(c => c.name)];

  const isSaving = addMut.isPending || updateMut.isPending;

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        icon={CreditCard}
        title="Transactions"
        subtitle={isLoading ? 'Loading…' : `${total} transaction${total !== 1 ? 's' : ''} total`}
      >
        <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowScanner(true)}>
          <Camera size={13} /> Scan Receipt
        </button>
        <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowSMS(true)}
          style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)', color: 'var(--green)' }}>
          <MessageSquare size={13} /> Import SMS
        </button>
        <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowCSV(true)}>
          <Upload size={13} /> Import CSV
        </button>
        <button className="n-btn n-btn-primary n-btn-sm" onClick={() => { reset(); setShowForm(p => !p); }}>
          <Plus size={13} /> New transaction
        </button>
      </PageHeader>

      {/* ── Inline Add/Edit Form ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginBottom: '24px' }}
          >
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '20px',
              background: 'var(--bg-secondary)',
            }}>
              {/* Form header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <CreditCard size={15} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
                  {editingId ? 'Edit transaction' : 'New transaction'}
                </span>
                <button onClick={reset} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px 6px' }}>
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Row 1: Type, Category, Amount, Date */}
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
                    <select className="n-select" style={{ height: '34px' }} value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}>
                      {allCats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="n-label">Amount (₹)</label>
                    <input className="n-input" style={{ height: '34px' }} type="number"
                      min="0.01" step="0.01" placeholder="0.00"
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div>
                    <label className="n-label">Date</label>
                    <input className="n-input" style={{ height: '34px' }} type="date"
                      value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                </div>

                {/* Row 2: Merchant (with AI suggest) + Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="n-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Store size={10} /> Merchant / Payee
                      {suggesting && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="n-input" style={{ height: '34px', paddingRight: '36px' }}
                        type="text" placeholder="e.g. Swiggy, Amazon, HDFC…"
                        value={form.merchant}
                        onChange={e => setForm({ ...form, merchant: e.target.value })}
                        onBlur={e => suggestCategory(e.target.value)}
                      />
                      <button
                        type="button"
                        title="AI: auto-suggest category from merchant"
                        onClick={() => suggestCategory(form.merchant)}
                        style={{
                          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                          border: 'none', background: 'none', cursor: 'pointer',
                          color: 'var(--accent)', display: 'flex', alignItems: 'center', padding: '2px',
                        }}>
                        <Sparkles size={13} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="n-label">Description / Notes</label>
                    <input className="n-input" style={{ height: '34px' }} type="text"
                      placeholder="What was this for?"
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>

                {/* Row 3: Tags */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="n-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={10} /> Tags <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span>
                  </label>
                  <input className="n-input" style={{ height: '34px' }} type="text"
                    placeholder="e.g. work, travel, urgent"
                    value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                </div>

                {/* Recurring toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', marginBottom: '12px', userSelect: 'none' }}>
                  <input type="checkbox" checked={form.isRecurring} disabled={!!editingId}
                    onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
                  <RefreshCw size={13} style={{ opacity: 0.55 }} />
                  Recurring transaction
                </label>

                {form.isRecurring && !editingId && (
                  <div style={{ marginBottom: '14px' }}>
                    <label className="n-label">Frequency</label>
                    <select className="n-select" style={{ width: '160px', height: '34px' }}
                      value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="submit" disabled={isSaving} className="n-btn n-btn-primary n-btn-sm">
                    {isSaving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : (editingId ? 'Update transaction' : 'Add transaction')}
                  </button>
                  <button type="button" onClick={reset} className="n-btn n-btn-default n-btn-sm">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--r)',
          padding: '0 10px', height: '32px', minWidth: '180px',
        }}>
          <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={filters.search}
            onChange={e => applyFilters({ ...filters, search: e.target.value })}
            placeholder="Search merchant, description, category…"
            style={{ border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text)', background: 'transparent', flex: 1 }}
          />
          {isFetching && !isLoading && (
            <Loader2 size={11} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          )}
        </div>

        <select className="n-select" style={{ width: 'auto', height: '32px', fontSize: '13px' }}
          value={filters.type} onChange={e => applyFilters({ ...filters, type: e.target.value })}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <button onClick={() => setShowFilters(p => !p)}
          className={`n-btn n-btn-sm ${showFilters ? 'n-btn-blue' : 'n-btn-default'}`} style={{ height: '32px' }}>
          <SlidersHorizontal size={13} /> Filters
        </button>
      </div>

      {/* ── Expanded filter panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px',
              marginBottom: '12px', background: 'var(--bg-secondary)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px',
            }}>
              <div>
                <label className="n-label">Category</label>
                <select className="n-select" style={{ height: '32px', fontSize: '13px' }}
                  value={filters.category} onChange={e => applyFilters({ ...filters, category: e.target.value })}>
                  <option value="all">All categories</option>
                  {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="n-label">From</label>
                <input className="n-input" style={{ height: '32px' }} type="date"
                  value={filters.dateFrom} onChange={e => applyFilters({ ...filters, dateFrom: e.target.value })} />
              </div>
              <div>
                <label className="n-label">To</label>
                <input className="n-input" style={{ height: '32px' }} type="date"
                  value={filters.dateTo} onChange={e => applyFilters({ ...filters, dateTo: e.target.value })} />
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

      {/* ── Transaction Table ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {/* Table toolbar */}
        <div style={{
          padding: '9px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {isLoading ? 'Loading…' : `Showing ${txns.length} of ${total}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(filters.type !== 'all' || filters.category !== 'all' || filters.search || filters.dateFrom || filters.dateTo) && (
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>Filters active</span>
            )}
            <button className="n-btn n-btn-ghost n-btn-sm" style={{ fontSize: '12px', color: 'var(--text-3)' }}
              onClick={() => setShowCSV(true)} title="Import from bank CSV">
              <FileText size={12} /> Import CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
            Loading transactions…
          </div>
        ) : txns.length === 0 ? (
          <div className="n-empty">
            <div className="n-empty-icon"><CreditCard size={28} strokeWidth={1.2} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No transactions found</p>
            <p style={{ fontSize: '13px' }}>
              {filters.search || filters.type !== 'all' || filters.category !== 'all'
                ? 'Try adjusting your filters'
                : 'Click "New transaction" to add your first one'}
            </p>
          </div>
        ) : (
          <div className="n-table-wrapper">
            <table className="n-table">
              <thead>
                <tr>
                  <SortHeader label="Date"     field="date"     sort={sort} onSort={handleSort} />
                  <th>Type</th>
                  <SortHeader label="Category" field="category" sort={sort} onSort={handleSort} />
                  <th>Merchant / Description</th>
                  <th>Tags</th>
                  <SortHeader label="Amount" field="amount" sort={sort} onSort={handleSort} style={{ textAlign: 'right' }} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id || t._id}>
                    {/* Date */}
                    <td style={{ color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`n-tag n-tag-${t.type === 'income' ? 'green' : 'red'}`}>
                        {t.type === 'income' ? '↑' : '↓'} {t.type}
                      </span>
                    </td>

                    {/* Category */}
                    <td style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{t.category}</td>

                    {/* Merchant + Description */}
                    <td style={{ maxWidth: '200px' }}>
                      {t.merchant && (
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Store size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                          {t.merchant}
                          <FlagBadge flags={t.flags || []} />
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description || (!t.merchant && <span style={{ fontStyle: 'italic' }}>—</span>)}
                        {!t.merchant && <FlagBadge flags={t.flags || []} />}
                      </div>
                    </td>

                    {/* Tags */}
                    <td>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {(t.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="n-tag n-tag-gray" style={{ fontSize: '11px', padding: '1px 5px' }}>
                            {tag}
                          </span>
                        ))}
                        {(t.tags || []).length > 2 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>+{t.tags.length - 2}</span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{
                      fontWeight: 600,
                      color: t.type === 'income' ? 'var(--green)' : 'var(--red)',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}>
                      {t.type === 'income' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
                        <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                          onClick={() => handleEdit(t)}
                          className="n-btn n-btn-ghost n-btn-sm"
                          style={{ color: 'var(--text-3)', padding: '4px 7px' }}
                          title="Edit">
                          <Pencil size={12} />
                        </motion.button>
                        <motion.button
                          whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                          onClick={() => { if (window.confirm('Delete this transaction?')) deleteMut.mutate(t.id || t._id); }}
                          className="n-btn n-btn-ghost n-btn-sm"
                          style={{ color: 'var(--text-3)', padding: '4px 7px' }}
                          disabled={deleteMut.isPending}
                          title="Delete">
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

        {/* Load More */}
        {hasNextPage && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="n-btn n-btn-default n-btn-sm"
            >
              {isFetchingNextPage
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading more…</>
                : <><ChevronDown size={13} /> Load {Math.min(LIMIT, total - txns.length)} more</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Receipt Scanner Modal ────────────────────────────────────────────── */}
      {showScanner && (
        <ReceiptScannerModal
          onClose={() => setShowScanner(false)}
          onExtracted={(data) => {
            setForm(f => ({
              ...f,
              amount:   data.amount ? String(data.amount) : f.amount,
              date:     data.date   || f.date,
              merchant: data.merchant || f.merchant,
              type:     'expense',
            }));
            setShowForm(true);
          }}
        />
      )}

      {/* ── CSV Import Modal ─────────────────────────────────────────────────── */}
      {showCSV && (
        <CSVImportModal
          onClose={() => setShowCSV(false)}
          onImported={() => { invalidate(); setShowCSV(false); }}
        />
      )}

      {/* ── SMS Import Modal ─────────────────────────────────────────────────── */}
      {showSMS && (
        <SMSImportModal
          onClose={() => setShowSMS(false)}
          onImported={() => { invalidate(); }}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
