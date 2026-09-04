/**
 * CommandPalette — ⌘K (Ctrl+K on Windows) global search overlay.
 *
 * Features:
 * - Search transactions by description, category, amount
 * - Quick navigation shortcuts to all pages
 * - Keyboard navigation: ↑↓ arrows, Enter to select, Esc to close
 * - Notion-exact backdrop blur + shadow
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlass as Search,
  SquaresFour as LayoutDashboard,
  CreditCard as CreditCard,
  ArrowsClockwise as RefreshCcw,
  Target as Target,
  Wallet as Wallet,
  ChartBar as BarChart3,
  GearSix as Settings,
  ArrowRight as ArrowRight,
  TrendUp as TrendingUp,
  TrendDown as TrendingDown,
  Hash as Hash,
} from '@phosphor-icons/react';
import { fetchTransactions } from '../../api/transactions';

const PAGES = [
  { label: 'Dashboard',    to: '/dashboard',    icon: LayoutDashboard, desc: 'Financial overview' },
  { label: 'Transactions', to: '/transactions', icon: CreditCard,       desc: 'Add and manage transactions' },
  { label: 'Recurring',    to: '/recurring',    icon: RefreshCcw,       desc: 'Scheduled repeating transactions' },
  { label: 'Goals',        to: '/goals',        icon: Target,           desc: 'Savings milestones' },
  { label: 'Budgets',      to: '/budgets',      icon: Wallet,           desc: 'Monthly spending limits' },
  { label: 'Reports',      to: '/reports',      icon: BarChart3,        desc: 'Charts and analytics' },
  { label: 'Settings',     to: '/settings',     icon: Settings,         desc: 'Profile and preferences' },
];

const CommandPalette = ({ open, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const { data: allTxns = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: open,
    staleTime: 60_000,
  });

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build results list
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show page shortcuts when no query
      return PAGES.map(p => ({ type: 'page', ...p }));
    }

    const q = query.toLowerCase();

    // Filter pages
    const pages = PAGES
      .filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
      .map(p => ({ type: 'page', ...p }));

    // Filter transactions
    const txns = allTxns
      .filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
      .slice(0, 5)
      .map(t => ({ type: 'txn', ...t }));

    return [...pages, ...txns];
  }, [query, allTxns]);

  // Keep selected in bounds
  useEffect(() => {
    setSelected(0);
  }, [results.length]);

  const select = useCallback((item) => {
    if (item.type === 'page') {
      navigate(item.to);
    } else {
      navigate('/transactions');
    }
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selected]) select(results[selected]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selected, select, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,15,15,0.4)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Palette — keyboard-initiated (⌘K), opened many times a day:
             no entrance transform, just an instant fade (cf. Raycast/Linear) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '15vh', left: '50%',
              transform: 'translateX(-50%)',
              width: '560px', maxWidth: 'calc(100vw - 32px)',
              zIndex: 1001,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-float)',
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px',
              borderBottom: results.length > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <Search size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, transactions…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: '15px', color: 'var(--text)',
                }}
              />
              <span className="n-kbd">Esc</span>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div
                ref={listRef}
                style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px' }}
              >
                {/* Section header */}
                {!query.trim() && (
                  <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Pages
                  </div>
                )}
                {query.trim() && results.some(r => r.type === 'page') && (
                  <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Pages
                  </div>
                )}

                {results.map((item, i) => {
                  const isSelected = i === selected;

                  if (item.type === 'page') {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.to}
                        onClick={() => select(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 12px', borderRadius: 'var(--r)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--bg-hover)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <div style={{
                          width: '28px', height: '28px', borderRadius: 'var(--r)',
                          background: 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={14} style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{item.desc}</div>
                        </div>
                        {isSelected && <ArrowRight size={13} style={{ color: 'var(--text-3)' }} />}
                      </div>
                    );
                  }

                  // Transaction result
                  const txDivider = i > 0 && results[i - 1].type === 'page';
                  return (
                    <React.Fragment key={item.id}>
                      {txDivider && (
                        <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px' }}>
                          Transactions
                        </div>
                      )}
                      <div
                        onClick={() => select(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 12px', borderRadius: 'var(--r)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--bg-hover)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <div style={{
                          width: '28px', height: '28px', borderRadius: 'var(--r)',
                          background: item.type_field === 'income' ? 'var(--green-bg)' : 'var(--red-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {item.type === 'income'
                            ? <TrendingUp size={13} style={{ color: 'var(--green)' }} />
                            : <TrendingDown size={13} style={{ color: 'var(--red)' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description || item.category}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                            {item.category} · {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: item.type === 'income' ? 'var(--brand)' : 'var(--text)',
                          flexShrink: 0,
                        }}>
                          {item.type === 'income' ? '+' : '−'}₹{item.amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {query.trim() && results.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                No results for "<strong style={{ color: 'var(--text-2)' }}>{query}</strong>"
              </div>
            )}

            {/* Footer */}
            <div style={{
              display: 'flex', gap: '16px', padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: '11px', color: 'var(--text-3)',
            }}>
              <span><span className="n-kbd">↑↓</span> Navigate</span>
              <span><span className="n-kbd">↵</span> Open</span>
              <span><span className="n-kbd">Esc</span> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
