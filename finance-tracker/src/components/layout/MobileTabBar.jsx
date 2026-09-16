/**
 * MobileTabBar — the phone's primary navigation.
 *
 * Four destinations people open most, plus "Menu", which raises a bottom
 * sheet listing every other page in the same groups as the laptop sidebar
 * (navGroups.js) — a real map of the app, not a drawer with a hidden "More".
 * Rendered on every size but only displayed at ≤640px (mobile-compact.css).
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SquaresFour, CreditCard, Folder, Target, List, X } from '@phosphor-icons/react';
import { NAV_GROUPS, NAV_FOOTER } from './navGroups';

const TABS = [
  { to: '/dashboard',    icon: SquaresFour, label: 'Home' },
  { to: '/transactions', icon: CreditCard,  label: 'Activity' },
  { to: '/budgets',      icon: Folder,      label: 'Budgets' },
  { to: '/goals',        icon: Target,      label: 'Goals' },
];
const TAB_PATHS = new Set(TABS.map(t => t.to));

// `onMenu` is still accepted from AppLayout but no longer needed: the sheet lives here
export default function MobileTabBar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // any navigation closes the sheet
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // the Menu tab reads as active when you're on a page that lives in the sheet
  const inSheet = !TAB_PATHS.has(pathname);

  return (
    <>
      <nav className="mtab" aria-label="Primary">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mtab-item${isActive ? ' is-active' : ''}`}>
            <Icon size={21} weight="fill" />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mtab-item${open || inSheet ? ' is-active' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="nav-sheet"
        >
          {open ? <X size={21} weight="bold" /> : <List size={21} weight="bold" />}
          <span>Menu</span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim" className="nav-sheet-scrim" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              key="sheet" id="nav-sheet" className="nav-sheet" role="dialog" aria-modal="true" aria-label="All pages"
              initial={{ y: '104%' }} animate={{ y: 0 }} exit={{ y: '104%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            >
              <span className="nav-sheet-grabber" aria-hidden="true" />
              {NAV_GROUPS.map(group => (
                <section key={group.key} className="nav-sheet-group">
                  <h2 className="nav-sheet-label">{group.label || 'Main'}</h2>
                  <div className="nav-sheet-grid">
                    {group.items.map(({ to, icon: Icon, label }) => (
                      <NavLink key={to} to={to} className={({ isActive }) => `nav-sheet-item${isActive ? ' is-active' : ''}`}>
                        <Icon size={20} weight="fill" />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </section>
              ))}
              <div className="nav-sheet-foot">
                {NAV_FOOTER.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `nav-sheet-row${isActive ? ' is-active' : ''}`}>
                    <Icon size={18} weight="fill" /> {label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
