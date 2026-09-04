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
  X as X,
  Bell as Bell,
  Warning as AlertTriangle,
  CheckCircle as CheckCircle2,
  Target as Target,
  ArrowsClockwise as RefreshCcw,
  TrendUp as TrendingUp,
  Info as Info,
  Wallet as Wallet,
  Trash as Trash2,
  Checks as CheckCheck,
} from '@phosphor-icons/react';
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
          <div className="notif-scrim" onClick={onClose} />

          <motion.div
            className="notif-pop"
            role="dialog" aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="notif-head">
              <div className="notif-head-title">
                <Bell size={15} weight="fill" />
                <span>Notifications</span>
                {totalCount > 0 && <b>{totalCount}</b>}
              </div>
              <div className="notif-head-actions">
                {unreadCount > 0 && (
                  <button onClick={() => markAllMut.mutate()} title="Mark all read"><CheckCheck size={14} /></button>
                )}
                {serverNotes.length > 0 && (
                  <button onClick={() => clearMut.mutate()} title="Clear all"><Trash2 size={14} /></button>
                )}
                <button onClick={onClose} title="Close"><X size={15} /></button>
              </div>
            </div>

            <div className="notif-list">
              {allNotifications.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon"><Bell size={18} weight="fill" /></span>
                  <b>You're all caught up</b>
                  <p>Budget, payment and goal alerts appear here.</p>
                </div>
              ) : (
                allNotifications.map((n, i) => {
                  const Icon = n.icon;
                  const s    = STYLES[n.type] || STYLES.info;
                  const cls = 'notif-row'
                    + (n.isServer && !n.isRead ? ' is-unread' : '')
                    + (n.isRead ? ' is-read' : '')
                    + (n.link ? ' is-link' : '');
                  return (
                    <motion.div
                      key={n.id}
                      className={cls}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 6) * 0.03 }}
                      onClick={() => { if (n.link) { navigate(n.link); onClose(); } }}
                    >
                      <span className="notif-row-icon" style={{ background: s.bg, color: s.color }}>
                        <Icon size={14} weight="fill" />
                      </span>
                      <div className="notif-row-body">
                        <div className="notif-row-title">{n.title}</div>
                        <div className="notif-row-desc">{n.desc}</div>
                        {n.time && (
                          <div className="notif-row-time">
                            {n.time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      {n.isServer && (
                        <button className="notif-del-btn" title="Dismiss"
                          onClick={(e) => { e.stopPropagation(); deleteMut.mutate(n.serverId); }}>
                          <X size={12} />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {allNotifications.length > 0 && (
              <div className="notif-foot">
                {serverNotes.length > 0 ? (unreadCount + ' unread · tap an alert to open it') : 'Live alerts from your data'}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
