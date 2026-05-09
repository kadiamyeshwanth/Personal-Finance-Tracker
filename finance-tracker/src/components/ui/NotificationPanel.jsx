/**
 * NotificationPanel — Slide-in drawer with smart financial alerts.
 *
 * Notifications are computed client-side from existing cached data:
 *  - 🔴 Budget exceeded (>100%)
 *  - 🟡 Budget warning (>80%)
 *  - 🎯 Goal nearly complete (>90%)
 *  - ✅ Goal completed (100%)
 *  - 🔄 Upcoming recurring (within 7 days)
 *  - 💡 No transactions yet (onboarding)
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, AlertTriangle, CheckCircle2, Target,
  RefreshCcw, TrendingUp, Info, Wallet,
} from 'lucide-react';
import { fetchTransactions } from '../../api/transactions';
import { fetchBudgets } from '../../api/budgets';
import { fetchGoals } from '../../api/goals';

// ── Notification builder ──────────────────────────────────────────────────────
const useNotifications = () => {
  const { data: allTxns = [] }  = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 30_000 });
  const { data: budgets = [] }  = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets,      staleTime: 30_000 });
  const { data: goals   = [] }  = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals,        staleTime: 30_000 });

  return useMemo(() => {
    const notes = [];
    const txns  = allTxns.filter(t => !t.isRecurring);
    const recurring = allTxns.filter(t => t.isRecurring);

    // ── Budget alerts ─────────────────────────────────────────────────────
    const spendMap = txns
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

    budgets.forEach(b => {
      const spent = spendMap[b.category] || 0;
      const pct   = (spent / b.limit) * 100;
      if (pct >= 100) {
        notes.push({
          id:    `budget-over-${b._id}`,
          type:  'danger',
          icon:  AlertTriangle,
          title: `Budget exceeded — ${b.category}`,
          desc:  `₹${spent.toLocaleString('en-IN')} spent of ₹${b.limit.toLocaleString('en-IN')} limit (${pct.toFixed(0)}%)`,
          time:  null,
        });
      } else if (pct >= 80) {
        notes.push({
          id:    `budget-warn-${b._id}`,
          type:  'warning',
          icon:  Wallet,
          title: `Budget warning — ${b.category}`,
          desc:  `${pct.toFixed(0)}% used · ₹${(b.limit - spent).toLocaleString('en-IN')} remaining`,
          time:  null,
        });
      }
    });

    // ── Goal alerts ───────────────────────────────────────────────────────
    goals.forEach(g => {
      const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
      if (pct >= 100) {
        notes.push({
          id:    `goal-done-${g._id}`,
          type:  'success',
          icon:  CheckCircle2,
          title: `Goal achieved — ${g.name}`,
          desc:  `You've reached your ₹${g.targetAmount.toLocaleString('en-IN')} target. 🎉`,
          time:  null,
        });
      } else if (pct >= 90) {
        notes.push({
          id:    `goal-close-${g._id}`,
          type:  'info',
          icon:  Target,
          title: `Almost there — ${g.name}`,
          desc:  `${pct.toFixed(0)}% funded · only ₹${(g.targetAmount - g.currentAmount).toLocaleString('en-IN')} to go`,
          time:  null,
        });
      }
    });

    // ── Upcoming recurring ────────────────────────────────────────────────
    const today = new Date();
    recurring.forEach(r => {
      const origDate   = new Date(r.date);
      let nextFire     = null;

      if (r.frequency === 'monthly') {
        // Next fire: same day-of-month in current or next month
        nextFire = new Date(today.getFullYear(), today.getMonth(), origDate.getDate());
        if (nextFire <= today) nextFire.setMonth(nextFire.getMonth() + 1);
      } else if (r.frequency === 'yearly') {
        nextFire = new Date(today.getFullYear(), origDate.getMonth(), origDate.getDate());
        if (nextFire <= today) nextFire.setFullYear(nextFire.getFullYear() + 1);
      } else if (r.frequency === 'weekly') {
        nextFire = new Date(today);
        const diff = (origDate.getDay() - today.getDay() + 7) % 7 || 7;
        nextFire.setDate(today.getDate() + diff);
      }

      if (nextFire) {
        const daysUntil = Math.ceil((nextFire - today) / 86_400_000);
        if (daysUntil >= 0 && daysUntil <= 7) {
          notes.push({
            id:    `recurring-${r._id}`,
            type:  'recurring',
            icon:  RefreshCcw,
            title: `${r.type === 'income' ? 'Income' : 'Payment'} due in ${daysUntil === 0 ? 'today' : `${daysUntil}d`}`,
            desc:  `${r.category} · ₹${r.amount.toLocaleString('en-IN')} (${r.frequency})`,
            time:  nextFire,
          });
        }
      }
    });

    // ── Onboarding ────────────────────────────────────────────────────────
    if (txns.length === 0) {
      notes.push({
        id:    'onboard',
        type:  'info',
        icon:  TrendingUp,
        title: 'Welcome to Finance Tracker!',
        desc:  'Add your first transaction to start seeing insights.',
        time:  null,
      });
    }

    // Sort: danger → warning → success → info → recurring
    const ORDER = { danger: 0, warning: 1, success: 2, recurring: 3, info: 4 };
    return notes.sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));
  }, [allTxns, budgets, goals]);
};

// ── Color map ─────────────────────────────────────────────────────────────────
const STYLES = {
  danger:    { color: 'var(--red)',    bg: 'var(--red-bg)' },
  warning:   { color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  success:   { color: 'var(--green)',  bg: 'var(--green-bg)' },
  info:      { color: 'var(--accent)', bg: 'var(--accent-bg)' },
  recurring: { color: 'var(--blue)',   bg: 'var(--blue-bg)' },
};

// ── Panel component ───────────────────────────────────────────────────────────
const NotificationPanel = ({ open, onClose }) => {
  const notifications = useNotifications();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.2)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '340px', zIndex: 901,
              background: 'var(--bg)',
              borderLeft: '1px solid var(--border)',
              boxShadow: 'var(--shadow-float)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--bg)',
                    background: 'var(--red)', borderRadius: '10px',
                    padding: '1px 7px', lineHeight: '18px',
                  }}>
                    {notifications.length}
                  </span>
                )}
              </div>
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                  }}>
                    <Bell size={20} strokeWidth={1.2} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>
                    All clear!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                    No alerts right now. Keep up the great work.
                  </div>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const Icon    = n.icon;
                  const s       = STYLES[n.type] || STYLES.info;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '12px 14px', borderRadius: 'var(--r-md)',
                        marginBottom: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                      }}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: 'var(--r)',
                        background: s.bg, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={15} style={{ color: s.color }} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px', lineHeight: 1.4 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                          {n.desc}
                        </div>
                        {n.time && (
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', opacity: 0.7 }}>
                            {n.time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: '11px', color: 'var(--text-3)',
              textAlign: 'center', flexShrink: 0,
            }}>
              Notifications are computed from your live data
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
