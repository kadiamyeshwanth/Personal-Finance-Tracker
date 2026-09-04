/**
 * Sidebar — a control panel attached to the content well.
 *
 *  · Expanded  → labelled rows, brand lockup, "More" opens as an inline drawer.
 *  · Collapsed → icon rail; labels appear as hover chips; "More" opens as a
 *    floating menu anchored to its button.
 *
 * Collapse state is owned by AppLayout (persisted + auto below a breakpoint);
 * this component only renders. Search lives in the top bar now, not here.
 */
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMark, LogoWordmark } from '../ui/Logo';
import {
  SquaresFour, ChartBar, CreditCard, Folder, Target,
  Wallet, TrendUp, ArrowsClockwise, Tag, BookOpen,
  Trophy, UsersThree, Gift, GearSix, Lifebuoy,
  DotsThreeOutline, CaretRight, SidebarSimple,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { fetchBudgets } from '../../api/budgets';
import { fetchTransactions } from '../../api/transactions';
import { springFast } from '../../lib/motion';

const Row = ({ to, icon: Icon, label, badge = 0, onNavigate, collapsed }) => (
  <NavLink to={to} onClick={onNavigate} className="rail-item" data-tip={collapsed ? label : undefined}>
    {({ isActive }) => (
      <span className={`rail-btn${isActive ? ' is-active' : ''}`}>
        <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
        <span className="rail-label">{label}</span>
        {badge > 0 && <span className="rail-badge">{badge}</span>}
      </span>
    )}
  </NavLink>
);

const MORE_PATHS = ['/subscriptions', '/recurring', '/reports', '/family', '/challenges', '/journal', '/wrapped'];

export default function Sidebar({ collapsed = false, onToggleCollapse, onClose }) {
  const location = useLocation();
  const onMoreRoute = MORE_PATHS.includes(location.pathname);
  // Keep the drawer open whenever the user is inside a "More" section, so
  // navigating between those pages doesn't collapse it under them.
  const [moreOpen, setMoreOpen] = useState(onMoreRoute);
  const [flyPos, setFlyPos] = useState(null);
  const moreRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => { if (onMoreRoute && !collapsed) setMoreOpen(true); }, [onMoreRoute, collapsed]);

  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets, staleTime: 60_000 });
  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000 });

  const spendMap = allTxns
    .filter(t => !t.isRecurring && t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const overBudget = budgets.filter(b => (spendMap[b.category] || 0) >= b.limit).length;

  const PRIMARY = [
    { to: '/dashboard',    icon: SquaresFour, label: 'Overview' },
    { to: '/analytics',    icon: ChartBar,    label: 'Analytics' },
    { to: '/transactions', icon: CreditCard,  label: 'Transactions' },
    { to: '/investments',  icon: TrendUp,     label: 'Portfolio' },
    { to: '/wallets',      icon: Wallet,      label: 'Accounts' },
  ];
  const PLANNING = [
    { to: '/budgets', icon: Folder, label: 'Budgets', badge: overBudget },
    { to: '/goals',   icon: Target, label: 'Goals' },
  ];
  const MORE = [
    { to: '/subscriptions', icon: Tag,             label: 'Subscriptions' },
    { to: '/recurring',     icon: ArrowsClockwise, label: 'Recurring' },
    { to: '/reports',       icon: ChartBar,        label: 'Reports' },
    { to: '/family',        icon: UsersThree,      label: 'Family' },
    { to: '/challenges',    icon: Trophy,          label: 'Challenges' },
    { to: '/journal',       icon: BookOpen,        label: 'Journal' },
    { to: '/wrapped',       icon: Gift,            label: 'Monthly Wrapped' },
  ];

  // Close the collapsed-mode flyout on outside click / Esc.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => { if (!moreRef.current?.contains(e.target)) setMoreOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Collapsing the rail also closes an open drawer.
  useEffect(() => { if (collapsed) setMoreOpen(false); }, [collapsed]);

  // Close mobile overlay on navigate; the collapsed flyout closes too, but the
  // expanded inline drawer stays put (it self-manages via the onMoreRoute rule).
  const go = () => { if (collapsed) setMoreOpen(false); onClose?.(); };

  const openMore = () => {
    const next = !moreOpen;
    if (next && collapsed && toggleRef.current) {
      const r = toggleRef.current.getBoundingClientRect();
      const estH = MORE.length * 40 + 16;
      const top = Math.max(8, Math.min(r.top, window.innerHeight - 8 - estH));
      setFlyPos({ left: r.right + 8, top });
    }
    setMoreOpen(next);
  };

  return (
    <nav className={`rail${collapsed ? ' is-collapsed' : ''}`} aria-label="Primary">
      <div className="rail-top">
        <NavLink to="/dashboard" className="rail-brand" onClick={go} aria-label="Clario home">
          <LogoMark size={30} />
          {!collapsed && <LogoWordmark className="rail-wordmark" height={22} />}
        </NavLink>
        {onToggleCollapse && (
          <button
            type="button"
            className="rail-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tip={collapsed ? 'Expand' : undefined}
          >
            <SidebarSimple size={16} />
          </button>
        )}
      </div>

      <div className="rail-group">
        {PRIMARY.map(i => <Row key={i.to} {...i} collapsed={collapsed} onNavigate={go} />)}
      </div>

      {!collapsed && <div className="rail-group-label">Planning</div>}
      <div className="rail-group">
        {PLANNING.map(i => <Row key={i.to} {...i} collapsed={collapsed} onNavigate={go} />)}
      </div>

      {/* More */}
      <div className={`rail-more${moreOpen ? ' is-open' : ''}`} ref={moreRef}>
        <button
          type="button"
          ref={toggleRef}
          className="rail-item rail-more-toggle"
          onClick={openMore}
          aria-expanded={moreOpen}
          data-tip={collapsed ? 'More' : undefined}
        >
          <span className={`rail-btn${onMoreRoute ? ' is-active' : ''}`}>
            <DotsThreeOutline size={18} weight={moreOpen || onMoreRoute ? 'fill' : 'regular'} />
            <span className="rail-label">More</span>
            <CaretRight size={13} weight="bold" className="rail-more-caret" />
          </span>
        </button>

        <AnimatePresence initial={false}>
          {moreOpen && (
            collapsed ? (
              <motion.div
                key="fly"
                className="rail-flyout"
                role="menu"
                style={flyPos ? { position: 'fixed', left: flyPos.left, top: flyPos.top, bottom: 'auto' } : undefined}
                initial={{ opacity: 0, x: -6, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -6, scale: 0.98 }}
                transition={springFast}
              >
                {MORE.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={go} className="rail-flyout-item" role="menuitem">
                    {({ isActive }) => (
                      <><Icon size={17} weight={isActive ? 'fill' : 'regular'} />{label}</>
                    )}
                  </NavLink>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="drawer"
                className="rail-subgroup"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                {MORE.map(i => <Row key={i.to} {...i} collapsed={false} onNavigate={go} />)}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <span className="rail-spacer" />

      <div className="rail-group">
        <Row to="/help" icon={Lifebuoy} label="Help" collapsed={collapsed} onNavigate={go} />
      </div>
    </nav>
  );
}
