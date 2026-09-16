/**
 * Sidebar — the app's full navigation.
 *
 * Every destination is listed, grouped by what it's for, instead of hiding
 * seven pages behind a "More" toggle. The groups are shared with the phone's
 * Menu sheet (MobileTabBar → NAV_GROUPS) so both surfaces stay in step.
 *
 *  · Expanded  → labelled rows under small group labels.
 *  · Collapsed → icon rail; labels appear as hover chips (tablet CSS).
 *
 * Collapse state is owned by AppLayout; this component only renders.
 */
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogoMark, LogoWordmark } from '../ui/Logo';
import { SidebarSimple, CaretRight } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { fetchBudgets } from '../../api/budgets';
import { fetchTransactions } from '../../api/transactions';
import { NAV_GROUPS, NAV_FOOTER } from './navGroups';

const OPEN_KEY = 'clario.nav.openGroups';

const Row = ({ to, icon: Icon, label, badge = 0, onNavigate, collapsed }) => (
  <NavLink to={to} onClick={onNavigate} className="rail-item" data-tip={collapsed ? label : undefined}>
    {({ isActive }) => (
      <span className={`rail-btn${isActive ? ' is-active' : ''}`}>
        <Icon size={18} weight="fill" />
        <span className="rail-label">{label}</span>
        {badge > 0 && <span className="rail-badge">{badge}</span>}
      </span>
    )}
  </NavLink>
);

export default function Sidebar({ collapsed = false, onToggleCollapse, onClose }) {
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets, staleTime: 60_000 });
  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 60_000 });

  const spendMap = allTxns
    .filter(t => !t.isRecurring && t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const badges = { '/budgets': budgets.filter(b => (spendMap[b.category] || 0) >= b.limit).length };

  const go = () => onClose?.();

  // Collapsible groups keep the rail short: only the section you're in (plus
  // any you've opened) shows its rows. Remembered on this device.
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(OPEN_KEY)) || []; } catch { return []; }
  });
  const toggleGroup = (key) => setOpenGroups(prev => {
    const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });

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

      {NAV_GROUPS.map(group => {
        // unlabelled (main) group is always open; the group holding the current
        // page is always open; the rest open only if the user opened them
        const hasActive = group.items.some(i => pathname === i.to || pathname.startsWith(`${i.to}/`));
        const isOpen = !group.label || hasActive || openGroups.includes(group.key);
        const groupBadge = group.items.reduce((s, i) => s + (badges[i.to] || 0), 0);
        return (
          <React.Fragment key={group.key}>
            {group.label && !collapsed && (
              <button
                type="button"
                className={`rail-group-label rail-group-toggle${isOpen ? ' is-open' : ''}`}
                onClick={() => !hasActive && toggleGroup(group.key)}
                aria-expanded={isOpen}
                aria-controls={`rail-group-${group.key}`}
                disabled={hasActive}
              >
                <span>{group.label}</span>
                {!isOpen && groupBadge > 0 && <span className="rail-group-dot" aria-label={`${groupBadge} alerts`} />}
                <CaretRight size={10} weight="bold" className="rail-group-caret" />
              </button>
            )}
            <div id={`rail-group-${group.key}`} className={`rail-group-wrap${isOpen ? '' : ' is-closed'}`}>
              <div className="rail-group">
                {group.items.map(i => (
                  <Row key={i.to} {...i} badge={badges[i.to] || 0} collapsed={collapsed} onNavigate={go} />
                ))}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <span className="rail-spacer" />

      <div className="rail-group">
        {NAV_FOOTER.map(i => <Row key={i.to} {...i} collapsed={collapsed} onNavigate={go} />)}
      </div>
    </nav>
  );
}
