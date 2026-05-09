import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import CommandPalette from '../ui/CommandPalette';
import NotificationPanel from '../ui/NotificationPanel';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../../api/transactions';
import { fetchBudgets } from '../../api/budgets';
import { fetchGoals } from '../../api/goals';

const AppLayout = () => {
  const { isLoggedIn, isVerifying } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen]           = useState(false);
  const [notifOpen, setNotifOpen]               = useState(false);
  const location = useLocation();

  // Compute unread count for badge
  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000, enabled: isLoggedIn });
  const { data: budgets  = [] } = useQuery({ queryKey: ['budgets'],     queryFn: fetchBudgets,     staleTime: 60_000, enabled: isLoggedIn });
  const { data: goals    = [] } = useQuery({ queryKey: ['goals'],       queryFn: fetchGoals,       staleTime: 60_000, enabled: isLoggedIn });

  const notifCount = React.useMemo(() => {
    let n = 0;
    const txns    = allTxns.filter(t => !t.isRecurring);
    const spendMap = txns.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    budgets.forEach(b => { const pct = (spendMap[b.category] || 0) / b.limit * 100; if (pct >= 80) n++; });
    goals.forEach(g => { const pct = (g.currentAmount / g.targetAmount) * 100; if (pct >= 90) n++; });
    return n;
  }, [allTxns, budgets, goals]);

  // ── Global ⌘K / Ctrl+K hotkey ──────────────────────────────────────────────
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

  // ── Mobile: auto-close sidebar on route change ──────────────────────────────
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);
  // Close sidebar when screen grows past mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => { if (!e.matches) setMobileSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isVerifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '22px', height: '22px', border: '2px solid var(--border)', borderTopColor: 'var(--text-3)', borderRadius: '50%', animation: 'n-spin 0.7s linear infinite' }} />
        <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading…</span>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="app-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)} />
      )}

      <div className={`app-sidebar${mobileSidebarOpen ? ' open' : ''}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(p => !p)}
          onOpenPalette={() => setPaletteOpen(true)}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      <div className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: 'var(--topbar-h)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: '8px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Mobile hamburger — only visible on mobile */}
          <motion.button className="topbar-hamburger"
            whileHover={{ backgroundColor: 'var(--bg-hover)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSidebarOpen(p => !p)}
            style={{
              display: 'none', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: 'var(--r)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)',
            }}
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </motion.button>

          {/* Desktop sidebar toggle */}
          <motion.button className="n-mobile-hidden"
            whileHover={{ backgroundColor: 'var(--bg-hover)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: 'var(--r)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-3)',
            }}
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </motion.button>

          {/* Breadcrumb / page title placeholder */}
          <div style={{ flex: 1 }} />

          {/* Bell — Notification Center */}
          <div style={{ position: 'relative' }}>
            <motion.button
              whileHover={{ backgroundColor: 'var(--bg-hover)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setNotifOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: 'var(--r)',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-3)',
              }}
            >
              <Bell size={15} strokeWidth={1.5} />
            </motion.button>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'var(--red)', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </div>

          {/* ⌘K hint in topbar */}
          <motion.button
            whileHover={{ backgroundColor: 'var(--bg-hover)' }}
            onClick={() => setPaletteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: 'var(--r)',
              border: '1px solid var(--border-strong)', background: 'transparent',
              color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span>Search</span>
            <span className="n-kbd" style={{ border: 'none', padding: 0 }}>⌘K</span>
          </motion.button>
        </div>

        {/* Page content with page transition */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 96px 96px' }}
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
