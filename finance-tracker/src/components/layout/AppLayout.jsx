import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { springFast } from '../../lib/motion';
import {
  SidebarSimple as PanelLeft,
  Bell,
  MagnifyingGlass as Search,
  GearSix,
  User,
  SignOut,
  SlidersHorizontal,
  Lifebuoy,
} from '@phosphor-icons/react';
import Sidebar from './Sidebar';
import Avatar from '../ui/Avatar';
import PageBoot from '../ui/PageBoot';
import { AnimatedThemeToggler } from '../ui/animated-theme-toggler';
import CommandPalette from '../ui/CommandPalette';
import NotificationPanel from '../ui/NotificationPanel';
import ConnectionBanner from '../ui/ConnectionBanner';
import AppBootSkeleton from '../ui/AppBootSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../../api/transactions';
import { fetchBudgets } from '../../api/budgets';
import { fetchGoals } from '../../api/goals';
import { fetchNotifications } from '../../api/notifications';

const AppLayout = () => {
  const { isLoggedIn, isVerifying, currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1000px)').matches);
  // Desktop: a permanent, always-labelled sidebar — no hover-expand, no
  // collapse, nothing to overlap. Mobile: an off-canvas drawer.
  const sidebarCollapsed = false;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60000, enabled: isLoggedIn });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets, staleTime: 60000, enabled: isLoggedIn });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: fetchGoals, staleTime: 60000, enabled: isLoggedIn });
  const { data: serverNotifs } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications, staleTime: 15000, enabled: isLoggedIn, refetchInterval: 30000 });

  const localAlerts = React.useMemo(() => {
    let n = 0;
    const spendMap = allTxns.filter(t => !t.isRecurring && t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    budgets.forEach(b => { if ((spendMap[b.category] || 0) / b.limit * 100 >= 80) n++; });
    goals.forEach(g => { if ((g.currentAmount / g.targetAmount) * 100 >= 90) n++; });
    return n;
  }, [allTxns, budgets, goals]);

  const serverUnread = serverNotifs?.unreadCount || 0;
  const totalBadge = serverUnread + localAlerts;

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => { setMobileSidebarOpen(false); setProfileOpen(false); setNotifOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const close = (e) => { if (!e.target.closest('.topbar-profile')) setProfileOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [profileOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => { if (!e.matches) setMobileSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Track the mobile breakpoint (drawer vs. resting icon-rail).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1000px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (isVerifying) return <AppBootSkeleton />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <MotionConfig reducedMotion="user">
    <div className="app-shell">
      <div className="app-frame" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{ display: 'block', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 799 }}
          />
        )}

        {/* Sidebar - permanent full-width panel on desktop, drawer on mobile */}
        <div
          className={`app-sidebar${mobileSidebarOpen ? ' open' : ''}`}
          data-collapsed="false"
        >
          <Sidebar
            collapsed={false}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          <ConnectionBanner />

          <div className="topbar">
            <button
              type="button"
              className="topbar-hamburger topbar-btn"
              onClick={() => setMobileSidebarOpen(p => !p)}
              aria-label="Open navigation"
            >
              <PanelLeft size={17} />
            </button>

            <button
              type="button"
              className="topbar-search"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
            >
              <Search size={15} />
              <span>Search transactions, pages…</span>
              <kbd>⌘K</kbd>
            </button>

            <div style={{ flex: 1 }} />

            <AnimatedThemeToggler
              className="topbar-btn"
              variant="circle"
              duration={480}
              theme={theme}
              onThemeChange={() => toggleTheme()}
              aria-label="Toggle theme"
            />

            <Link to="/settings" className="topbar-btn" aria-label="Settings">
              <GearSix size={17} />
            </Link>

            <div className="topbar-bell">
              <button
                type="button"
                className="topbar-btn"
                onClick={() => setNotifOpen(p => !p)}
                aria-label="Notifications"
              >
                <Bell size={17} />
              </button>
              {totalBadge > 0 && (
                <span className="topbar-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
              )}
            </div>

            <div className="topbar-profile">
              <button
                type="button"
                className="topbar-avatar"
                onClick={() => setProfileOpen(o => !o)}
                aria-label="Account menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <Avatar name={currentUser?.username} size={30} radius={9} />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    className="topbar-menu" role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="topbar-menu-head">
                      <Avatar name={currentUser?.username} size={34} radius={10} className="topbar-menu-avatar" />

                      <div>
                        <b>{currentUser?.username || 'Account'}</b>
                        <span>{currentUser?.email || 'Signed in'}</span>
                      </div>
                    </div>
                    <Link to="/settings" role="menuitem" className="topbar-menu-item" onClick={() => setProfileOpen(false)}>
                      <User size={15} /> Profile &amp; account
                    </Link>
                    <Link to="/settings" role="menuitem" className="topbar-menu-item" onClick={() => setProfileOpen(false)}>
                      <SlidersHorizontal size={15} /> Preferences
                    </Link>
                    <Link to="/help" role="menuitem" className="topbar-menu-item" onClick={() => setProfileOpen(false)}>
                      <Lifebuoy size={15} /> Help &amp; edge cases
                    </Link>
                    <div className="topbar-menu-sep" />
                    <button type="button" role="menuitem" className="topbar-menu-item topbar-menu-item--danger" onClick={() => { setProfileOpen(false); logout(); }}>
                      <SignOut size={15} /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {/* keyed on the route so it remounts and replays the CSS enter
               animation. A CSS keyframe (compositor-driven, `both` fill) can't
               stall the way the old framer AnimatePresence transition did when a
               heavy page (charts) starved its rAF and left it at opacity 0. */}
            <div
              className="app-page-in"
              style={{
                maxWidth: 'var(--page-max-w)',
                margin: '0 auto',
                padding: 'var(--page-pad-y) var(--page-pad-x) 96px',
              }}
            >
              <PageBoot routeKey={location.pathname}>
                <div key={location.pathname}><Outlet /></div>
              </PageBoot>
            </div>
          </main>
        </div>

        <CommandPalette open={paletteOpen} initialQuery={searchDraft} onClose={() => { setPaletteOpen(false); setSearchDraft(''); }} />
        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      </div>
    </div>
    </MotionConfig>
  );
};

export default AppLayout;
