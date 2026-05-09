import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, RefreshCcw, Target, Wallet,
  BarChart3, Settings, Search, LogOut, Sparkles, ChevronDown,
  Moon, Sun, PieChart, RefreshCw, Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { fetchBudgets } from '../../api/budgets';
import { fetchTransactions } from '../../api/transactions';

const SidebarItem = ({ to, icon: Icon, label, badge = 0 }) => (
  <NavLink to={to} style={{ textDecoration: 'none', display: 'block' }}>
    {({ isActive }) => (
      <motion.div
        whileHover={{ backgroundColor: 'rgba(55,53,47,0.08)' }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '5px 10px', borderRadius: 'var(--r)',
          color: isActive ? 'var(--text)' : 'var(--text-2)',
          fontWeight: isActive ? 500 : 400, fontSize: '14px',
          cursor: 'pointer',
          backgroundColor: isActive ? 'rgba(55,53,47,0.08)' : 'transparent',
          transition: 'color 0.15s', userSelect: 'none',
        }}
      >
        <Icon size={15} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0, opacity: isActive ? 0.85 : 0.6 }} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', borderRadius: '9px', background: 'var(--red)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '0 4px', flexShrink: 0 }}>
            {badge}
          </motion.span>
        )}
      </motion.div>
    )}
  </NavLink>
);

const Sidebar = ({ collapsed, onToggle, onOpenPalette }) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const initials = currentUser?.username?.[0]?.toUpperCase() || 'U';

  const { data: budgets = [] }  = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets,      staleTime: 60_000 });
  const { data: allTxns = [] }  = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000 });
  const expenses = allTxns.filter(t => !t.isRecurring && t.type === 'expense');
  const spendMap = expenses.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const overBudgetCount = budgets.filter(b => (spendMap[b.category] || 0) >= b.limit).length;

  const NAV_MAIN = [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: CreditCard,       label: 'Transactions' },
    { to: '/analytics',    icon: PieChart,         label: 'Analytics' },
    { to: '/budgets',      icon: Wallet,           label: 'Budgets', badge: overBudgetCount },
    { to: '/goals',        icon: Target,           label: 'Goals' },
  ];

  const NAV_FINANCE = [
    { to: '/wallets',       icon: Wallet,      label: 'Wallets' },
    { to: '/subscriptions', icon: Tag,         label: 'Subscriptions' },
    { to: '/recurring',     icon: RefreshCcw,  label: 'Recurring' },
    { to: '/reports',       icon: BarChart3,   label: 'Reports' },
    { to: '/ai-insights',   icon: Sparkles,    label: 'AI Insights' },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 0 : 'var(--sidebar-w)' }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        minHeight: '100vh', backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0,
        position: 'sticky', top: 0,
      }}
    >
      <div style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Workspace header */}
        <motion.div whileHover={{ backgroundColor: 'rgba(55,53,47,0.06)' }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', margin: '4px 6px 2px', borderRadius: 'var(--r)', cursor: 'pointer' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: 'linear-gradient(135deg, #2383e2 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={11} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Money Tracker</span>
          <ChevronDown size={13} color="var(--text-3)" />
        </motion.div>

        {/* Search */}
        <div style={{ padding: '2px 6px' }}>
          <motion.div whileHover={{ backgroundColor: 'rgba(55,53,47,0.06)' }} onClick={onOpenPalette}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: 'var(--r)', color: 'var(--text-3)', fontSize: '14px', cursor: 'pointer' }}>
            <Search size={14} strokeWidth={1.5} style={{ opacity: 0.6 }} />
            <span style={{ flex: 1 }}>Search</span>
            <span className="n-kbd" style={{ display: 'flex', gap: '2px' }}><span>⌘</span><span>K</span></span>
          </motion.div>
        </div>

        {/* Main nav */}
        <div style={{ padding: '10px 6px 2px' }}>
          <div style={{ padding: '4px 10px 5px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Main</div>
          {NAV_MAIN.map(({ to, icon, label, badge }) => <SidebarItem key={to} to={to} icon={icon} label={label} badge={badge} />)}
        </div>

        <hr className="n-divider" style={{ margin: '4px 10px' }} />

        {/* Finance nav */}
        <div style={{ padding: '2px 6px' }}>
          <div style={{ padding: '4px 10px 5px', fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Finance</div>
          {NAV_FINANCE.map(({ to, icon, label }) => <SidebarItem key={to} to={to} icon={icon} label={label} />)}
        </div>

        <hr className="n-divider" style={{ margin: '4px 10px' }} />

        {/* Settings + theme */}
        <div style={{ padding: '2px 6px' }}>
          <SidebarItem to="/settings" icon={Settings} label="Settings" />
          <motion.div whileHover={{ backgroundColor: 'rgba(55,53,47,0.06)' }} onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: 'var(--r)', color: 'var(--text-3)', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.5} style={{ opacity: 0.6 }} /> : <Moon size={15} strokeWidth={1.5} style={{ opacity: 0.6 }} />}
            <span style={{ flex: 1 }}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </motion.div>
        </div>

        <div style={{ flex: 1 }} />

        {/* User + logout */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
          <motion.div whileHover={{ backgroundColor: 'rgba(55,53,47,0.06)' }}
            onClick={() => { logout(); navigate('/login'); }} title="Sign out"
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: 'var(--r)', cursor: 'pointer' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'linear-gradient(135deg, #2383e2, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.username}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</div>
            </div>
            <LogOut size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
