/**
 * NotificationPanel — Real-time drawer backed by /api/notifications.
 * Merges server-side notifications (budget alerts, fraud flags) with
 * client-side computed alerts (upcoming recurring, goal milestones).
 */
import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  X, Bell, AlertTriangle, CheckCircle2, Target,
  RefreshCcw, TrendingUp, Info, Wallet, Trash2, CheckCheck,
} from 'lucide-react';
import { fetchTransactions } from '../../api/transactions';
import { fetchBudgets }      from '../../api/budgets';
import { fetchGoals }        from '../../api/goals';
import {
  fetchNotifications, markAllRead, deleteNotification, clearAllNotifications,
} from '../../api/notifications';

// ── Color map ──────────────────────────────────────────────────────────────
const STYLES = {
  danger:    { color: 'var(--red)',    bg: 'rgba(196,85,77,0.08)' },
  warning:   { color: 'var(--yellow)', bg: 'rgba(217,115,13,0.08)' },
  success:   { color: 'var(--green)',  bg: 'rgba(15,123,108,0.08)' },
  info:      { color: 'var(--accent)', bg: 'rgba(35,131,226,0.08)' },
  recurring: { color: 'var(--accent)', bg: 'rgba(35,131,226,0.08)' },
};

const ICON_MAP = {
  danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle2,
  info: Info, recurring: RefreshCcw,
};

// ── Client-side computed alerts (unchanged from original) ─────────────────
const useClientAlerts = () => {
  const { data: allTxns = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 30_000 });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets,      staleTime: 30_000 });
  const { data: goals   = [] } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals,        staleTime: 30_000 });

  return useMemo(() => {
    const notes = [];
    const txns = allTxns.filter(t => !t.isRecurring);
    const recurring = allTxns.filter(t => t.isRecurring);

    // Goal alerts
    goals.forEach(g => {
      const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
      if (pct >= 100) notes.push({ id: `goal-done-${g._id}`, type: 'success', icon: CheckCircle2, title: `Goal achieved — ${g.name}`, desc: `You've reached your ₹${g.targetAmount.toLocaleString('en-IN')} target. 🎉`, time: null, link: '/goals' });
      else if (pct >= 90) notes.push({ id: `goal-close-${g._id}`, type: 'info', icon: Target, title: `Almost there — ${g.name}`, desc: `${pct.toFixed(0)}% funded · ₹${(g.targetAmount - g.currentAmount).toLocaleString('en-IN')} to go`, time: null, link: '/goals' });
    });

    // Upcoming recurring
    const today = new Date();
    recurring.forEach(r => {
      const origDate = new Date(r.date);
      let nextFire   = null;
      if (r.frequency === 'monthly') {
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
          notes.push({ id: `recurring-${r._id}`, type: 'recurring', icon: RefreshCcw, title: `${r.type === 'income' ? 'Income' : 'Payment'} due ${daysUntil === 0 ? 'today' : `in ${daysUntil}d`}`, desc: `${r.category} · ₹${r.amount.toLocaleString('en-IN')} (${r.frequency})`, time: nextFire, link: '/recurring' });
        }
      }
    });

    if (txns.length === 0) notes.push({ id: 'onboard', type: 'info', icon: TrendingUp, title: 'Welcome to Finance Tracker!', desc: 'Add your first transaction to start seeing insights.', time: null, link: '/transactions' });

    return notes;
  }, [allTxns, budgets, goals]);
};

// ── Panel component ────────────────────────────────────────────────────────
const NotificationPanel = ({ open, onClose }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const clientAlerts = useClientAlerts();

  // Server notifications
  const { data: serverData } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 15_000,
    enabled: open,
  });
  const serverNotes  = serverData?.data        || [];
  const unreadCount  = serverData?.unreadCount || 0;

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read'); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearMut = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Cleared all notifications'); },
  });

  // Map server notifications to display format
  const serverFormatted = serverNotes.map(n => ({
    id: `server-${n._id}`,
    serverId: n._id,
    type: n.type,
    icon: ICON_MAP[n.type] || Info,
    title: n.title,
    desc: n.body,
    time: new Date(n.createdAt),
    isRead: n.isRead,
    link: n.link || null,
    isServer: true,
  }));

  const allNotifications = [
    ...serverFormatted.filter(n => !n.isRead),
    ...clientAlerts,
    ...serverFormatted.filter(n => n.isRead),
  ];

  const totalCount = unreadCount + clientAlerts.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.2)' }}
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '360px', zIndex: 901,
              background: 'var(--bg)', borderLeft: '1px solid var(--border)',
              boxShadow: 'var(--shadow-float)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: 'var(--text-2)' }} strokeWidth={1.5} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Notifications</span>
                {totalCount > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: 'var(--red)', borderRadius: '10px', padding: '1px 7px' }}>
                    {totalCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {unreadCount > 0 && (
                  <button onClick={() => markAllMut.mutate()} title="Mark all read"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px', borderRadius: 'var(--r)' }}>
                    <CheckCheck size={15} />
                  </button>
                )}
                {serverNotes.length > 0 && (
                  <button onClick={() => clearMut.mutate()} title="Clear all"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px', borderRadius: 'var(--r)' }}>
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {allNotifications.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Bell size={20} strokeWidth={1.2} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>All clear!</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No alerts right now. Keep up the great work.</div>
                </div>
              ) : (
                allNotifications.map((n, i) => {
                  const Icon = n.icon;
                  const s    = STYLES[n.type] || STYLES.info;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { if (n.link) { navigate(n.link); onClose(); } }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: '4px',
                        border: '1px solid var(--border)',
                        background: n.isServer && !n.isRead ? 'var(--bg-secondary)' : 'var(--bg)',
                        cursor: n.link ? 'pointer' : 'default',
                        opacity: n.isRead ? 0.6 : 1,
                        position: 'relative',
                      }}
                    >
                      {n.isServer && !n.isRead && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                      )}
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r)', background: s.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} style={{ color: s.color }} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px', lineHeight: 1.4 }}>{n.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.4 }}>{n.desc}</div>
                        {n.time && (
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', opacity: 0.7 }}>
                            {n.time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      {n.isServer && (
                        <button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(n.serverId); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', opacity: 0, padding: '2px', transition: 'opacity 0.15s', flexShrink: 0 }}
                          className="notif-del-btn">
                          <X size={12} />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', flexShrink: 0 }}>
              {serverNotes.length > 0 ? `${unreadCount} unread · Click alerts to navigate` : 'Real-time alerts from your data'}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
