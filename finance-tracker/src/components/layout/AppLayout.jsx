import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import CommandPalette from '../ui/CommandPalette';
import NotificationPanel from '../ui/NotificationPanel';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../../api/transactions';
import { fetchBudgets } from '../../api/budgets';
import { fetchGoals } from '../../api/goals';
import { fetchNotifications } from '../../api/notifications';

const AppLayout = () => {
  const { isLoggedIn, isVerifying } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen]           = useState(false);
  const [notifOpen, setNotifOpen]               = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000, enabled: isLoggedIn });
  const { data: budgets  = [] } = useQuery({ queryKey: ['budgets'],     queryFn: fetchBudgets,     staleTime: 60_000, enabled: isLoggedIn });
  const { data: goals    = [] } = useQuery({ queryKey: ['goals'],       queryFn: fetchGoals,       staleTime: 60_000, enabled: isLoggedIn });
  const { data: serverNotifs }  = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications, staleTime: 15_000, enabled: isLoggedIn, refetchInterval: 30_000 });

  // Total badge count: server unread + local alerts
  const localAlerts = React.useMemo(() => {
    let n = 0;
    const txns    = allTxns.filter(t => !t.isRecurring);
    const spendMap = txns.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    budgets.forEach(b => { const pct = (spendMap[b.category] || 0) / b.limit * 100; if (pct >= 80) n++; });
    goals.forEach(g   => { const pct = (g.currentAmount / g.targetAmount) * 100; if (pct >= 90) n++; });
    return n;
  }, [allTxns, budgets, goals]);

  const serverUnread  = serverNotifs?.unreadCount || 0;
  const totalBadge    = serverUnread + localAlerts;

  // ── Keyboard shortcut ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(p => !p);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Mobile: close sidebar on route change ─────────────────────────────────
  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => { if (!e.matches) setMobileSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Loading / auth guards ─────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-strong)', borderTopColor: 'var(--text-3)', borderRadius: '50%', animation: 'n-spin 0.7s linear infinite' }} />
        <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading…</span>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  // ── Current page breadcrumb ───────────────────────────────────────────────
  const PAGE_LABELS = {
    '/dashboard': 'Dashboard', '/transactions': 'Transactions', '/analytics': 'Analytics',
    '/budgets': 'Budgets', '/goals': 'Goals', '/wallets': 'Wallets',
    '/subscriptions': 'Subscriptions', '/recurring': 'Recurring', '/reports': 'Reports',
    '/ai-insights': 'AI Insights', '/settings': 'Settings', '/investments': 'Investments',
    '/journal': 'Journal', '/wrapped': 'Monthly Wrapped',
    '/challenges': 'Spending Challenges', '/family': 'Family Finance',
  };
  const pageLabel = PAGE_LABELS[location.pathname] || '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          style={{ display: 'block', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 799 }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <motion.div
        className={`app-sidebar${mobileSidebarOpen ? ' open' : ''}`}
        animate={{ width: sidebarCollapsed ? 0 : 'var(--sidebar-w)' }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(p => !p)}
          onOpenPalette={() => setPaletteOpen(true)}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </motion.div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Topbar — Notion's 45px chrome ─────────────────────────────── */}
        <div style={{
          height: 'var(--topbar-h)',
          display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: '4px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
        }}>

          {/* Mobile hamburger */}
          <motion.button
            className="topbar-hamburger"
            whileTap={{ scale: 0.92 }}
            onClick={() => setMobileSidebarOpen(p => !p)}
            style={{
              display: 'none',
              alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: 'var(--r)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)',
            }}
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </motion.button>

          {/* Desktop sidebar toggle */}
          <motion.button
            className="n-mobile-hidden n-topbar-btn"
            whileTap={{ scale: 0.92 }}
            onClick={() => setSidebarCollapsed(p => !p)}
            title="Toggle sidebar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: 'var(--r)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)', transition: 'all 0.15s',
            }}
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </motion.button>

          {/* Breadcrumb label */}
          {pageLabel && (
            <div style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 400, marginLeft: '4px', userSelect: 'none' }}>
              {pageLabel}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Search / ⌘K — compact pill like Notion */}
          <motion.button
            className="topbar-palette-hint"
            whileHover={{ background: 'var(--bg-hover)' }}
            onClick={() => setPaletteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: 'var(--r)',
              border: '1px solid var(--border-strong)',
              background: 'transparent', color: 'var(--text-3)',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Search size={12} strokeWidth={2} />
            <span>Search</span>
            <span style={{
              fontSize: '10px', color: 'var(--text-3)',
              border: '1px solid var(--border-strong)',
              borderRadius: '3px', padding: '1px 4px',
              background: 'var(--bg-secondary)',
            }}>⌘K</span>
          </motion.button>

          {/* Notification Bell */}
          <div style={{ position: 'relative', marginLeft: '2px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setNotifOpen(p => !p)}
              title="Notifications"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: 'var(--r)',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-3)', transition: 'all 0.15s',
              }}
              whileHover={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text)' }}
            >
              <Bell size={15} strokeWidth={1.5} />
            </motion.button>

            <AnimatePresence>
              {totalBadge > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '15px', height: '15px', borderRadius: '50%',
                    background: 'var(--red)', color: '#fff',
                    fontSize: '9px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                    border: '2px solid var(--bg)',
                  }}
                >
                  {totalBadge > 9 ? '9+' : totalBadge}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Page content with route transition ───────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{
                maxWidth: 'var(--page-max-w)',
                margin: '0 auto',
                padding: 'var(--page-pad-y) var(--page-pad-x) 96px',
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Global Notification Panel */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
};

export default AppLayout;
