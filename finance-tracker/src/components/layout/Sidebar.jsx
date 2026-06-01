/**
 * Sidebar — Notion-exact navigation sidebar.
 * Pixel-accurate Notion desktop sidebar with workspace header,
 * grouped nav sections, search shortcut, theme toggle, and user footer.
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, RefreshCcw, Target, Wallet,
  BarChart3, Settings, Search, LogOut, Sparkles, ChevronDown,
  Moon, Sun, PieChart, Tag, BookOpen, TrendingUp, Gift,
  Trophy, Users,
} from 'lucide-react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { fetchBudgets }      from '../../api/budgets';
import { fetchTransactions } from '../../api/transactions';

// ── Single nav item ───────────────────────────────────────────────────────────
const SidebarItem = ({ to, icon: Icon, label, badge = 0 }) => (
  <NavLink to={to} style={{ textDecoration: 'none', display: 'block' }}>
    {({ isActive }) => (
      <motion.div
        whileHover={{ backgroundColor: 'var(--bg-hover)' }}
        transition={{ duration: 0.08 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          borderRadius: 'var(--r)',
          color: isActive ? 'var(--text)' : 'var(--text-2)',
          fontWeight: isActive ? 500 : 400,
          fontSize: '14px',
          cursor: 'pointer',
          backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
          transition: 'color 0.1s',
          userSelect: 'none',
        }}
      >
        <Icon
          size={15}
          strokeWidth={isActive ? 2 : 1.5}
          style={{ flexShrink: 0, opacity: isActive ? 0.9 : 0.55 }}
        />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {badge > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: '17px', height: '17px', borderRadius: '8px',
              background: 'var(--red)', color: '#fff',
              fontSize: '10px', fontWeight: 700, padding: '0 4px', flexShrink: 0,
            }}
          >
            {badge}
          </motion.span>
        )}
      </motion.div>
    )}
  </NavLink>
);

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div style={{
    padding: '4px 12px 3px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginTop: '2px',
  }}>
    {children}
  </div>
);

// ── Main Sidebar component ────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, onOpenPalette }) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const navigate = useNavigate();
  const initials = currentUser?.username?.[0]?.toUpperCase() || 'U';

  // Badge: budgets over limit
  const { data: budgets = [] }  = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets,      staleTime: 60_000 });
  const { data: allTxns = [] }  = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000 });
  const spendMap        = allTxns.filter(t => !t.isRecurring && t.type === 'expense')
                                  .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const overBudgetCount = budgets.filter(b => (spendMap[b.category] || 0) >= b.limit).length;

  // Dark mode: hover colour needs to match
  const hoverBg = theme === 'dark' ? 'rgba(255,255,255,0.055)' : 'rgba(55,53,47,0.06)';

  const NAV_MAIN = [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/transactions', icon: CreditCard,       label: 'Transactions' },
    { to: '/analytics',    icon: PieChart,         label: 'Analytics'    },
    { to: '/budgets',      icon: Wallet,           label: 'Budgets',  badge: overBudgetCount },
    { to: '/goals',        icon: Target,           label: 'Goals'        },
  ];

  const NAV_FINANCE = [
    { to: '/wallets',       icon: Wallet,      label: 'Wallets'       },
    { to: '/subscriptions', icon: Tag,         label: 'Subscriptions' },
    { to: '/recurring',     icon: RefreshCcw,  label: 'Recurring'     },
    { to: '/investments',   icon: TrendingUp,  label: 'Investments'   },
    { to: '/reports',       icon: BarChart3,   label: 'Reports'       },
    { to: '/family',        icon: Users,       label: 'Family'        },
  ];

  const NAV_AI = [
    { to: '/ai-insights',  icon: Sparkles,  label: 'AI Insights'     },
    { to: '/challenges',   icon: Trophy,    label: 'Challenges'      },
    { to: '/journal',      icon: BookOpen,  label: 'Journal'         },
    { to: '/wrapped',      icon: Gift,      label: 'Monthly Wrapped' },
  ];

  return (
    /* The outer aside is sized/animated by AppLayout — here we just fill it */
    <div style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Workspace header ─────────────────────────────────────────────── */}
      <motion.div
        whileHover={{ backgroundColor: hoverBg }}
        transition={{ duration: 0.1 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px', margin: '6px 6px 2px',
          borderRadius: 'var(--r)', cursor: 'pointer',
        }}
      >
        {/* App logo pill */}
        <div style={{
          width: '22px', height: '22px',
          borderRadius: '5px',
          background: 'linear-gradient(135deg, #2383e2 0%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sparkles size={11} color="#fff" strokeWidth={2.5} />
        </div>

        <span style={{
          fontSize: '14px', fontWeight: 600,
          color: 'var(--text)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Money Tracker
        </span>

        <ChevronDown size={13} color="var(--text-3)" />
      </motion.div>

      {/* ── Search shortcut — Notion's "Search" item ─────────────────────── */}
      <div style={{ padding: '2px 6px' }}>
        <motion.div
          whileHover={{ backgroundColor: hoverBg }}
          onClick={onOpenPalette}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 10px', borderRadius: 'var(--r)',
            color: 'var(--text-3)', fontSize: '14px',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          <Search size={14} strokeWidth={1.5} style={{ opacity: 0.55, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Search</span>
          <span style={{
            display: 'flex', gap: '2px',
            fontSize: '11px', color: 'var(--text-3)',
            border: '1px solid var(--border-strong)',
            borderRadius: '3px', padding: '1px 5px',
            background: 'var(--bg-tertiary)',
          }}>
            ⌘K
          </span>
        </motion.div>
      </div>

      {/* ── Scrollable nav area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '8px' }}>

        {/* Main */}
        <div style={{ padding: '8px 6px 2px' }}>
          <SectionLabel>Main</SectionLabel>
          {NAV_MAIN.map(({ to, icon, label, badge }) => (
            <SidebarItem key={to} to={to} icon={icon} label={label} badge={badge} />
          ))}
        </div>

        <div style={{ margin: '4px 12px', borderTop: '1px solid var(--border)' }} />

        {/* Finance */}
        <div style={{ padding: '2px 6px' }}>
          <SectionLabel>Finance</SectionLabel>
          {NAV_FINANCE.map(({ to, icon, label }) => (
            <SidebarItem key={to} to={to} icon={icon} label={label} />
          ))}
        </div>

        <div style={{ margin: '4px 12px', borderTop: '1px solid var(--border)' }} />

        {/* AI & Tools */}
        <div style={{ padding: '2px 6px' }}>
          <SectionLabel>AI & Tools</SectionLabel>
          {NAV_AI.map(({ to, icon, label }) => (
            <SidebarItem key={to} to={to} icon={icon} label={label} />
          ))}
        </div>

        <div style={{ margin: '4px 12px', borderTop: '1px solid var(--border)' }} />

        {/* Settings + Theme */}
        <div style={{ padding: '2px 6px' }}>
          <SidebarItem to="/settings" icon={Settings} label="Settings" />

          {/* Theme toggle — non-navlink, styled same as nav item */}
          <motion.div
            whileHover={{ backgroundColor: hoverBg }}
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 10px', borderRadius: 'var(--r)',
              color: 'var(--text-2)', fontSize: '14px',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            {theme === 'dark'
              ? <Sun  size={15} strokeWidth={1.5} style={{ opacity: 0.55, flexShrink: 0 }} />
              : <Moon size={15} strokeWidth={1.5} style={{ opacity: 0.55, flexShrink: 0 }} />
            }
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </motion.div>
        </div>
      </div>

      {/* ── User footer (Notion's bottom user row) ───────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '6px 6px 8px', flexShrink: 0 }}>
        <motion.div
          whileHover={{ backgroundColor: hoverBg }}
          onClick={() => { logout(); navigate('/login'); }}
          title="Sign out"
          style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '7px 10px', borderRadius: 'var(--r)',
            cursor: 'pointer',
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '24px', height: '24px',
            borderRadius: '5px',
            background: 'linear-gradient(135deg, #2383e2, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px', fontWeight: 500, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentUser?.username}
            </div>
            <div style={{
              fontSize: '11px', color: 'var(--text-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentUser?.email}
            </div>
          </div>

          <LogOut size={13} style={{ color: 'var(--text-3)', opacity: 0.45, flexShrink: 0 }} />
        </motion.div>
      </div>
    </div>
  );
};

export default Sidebar;
