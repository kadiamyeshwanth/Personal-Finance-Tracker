import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorState, OfflineState } from '../components/ui/States';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus as Plus,
  Trash as Trash2,
  Target as Target,
  PlusCircle as PlusCircle,
  X as X,
} from '@phosphor-icons/react';
import { fetchGoals, addGoal, updateGoal, deleteGoal } from '../api/goals';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';

const GoalsPage = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '' });

  let goalsQ;
  const { data: goals = [], isLoading } = (goalsQ = useQuery({ queryKey: ['goals'], queryFn: fetchGoals }));

  const addMut = useMutation({
    mutationFn: addGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal created'); setForm({ name: '', targetAmount: '', deadline: '' }); setShowForm(false); },
    onError: e => toast.error(e.response?.data?.error || 'Failed to add goal'),
  });
  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal deleted'); },
    onError: () => toast.error('Failed to delete'),
  });
  const updateMut = useMutation({
    mutationFn: updateGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Contribution added!'); },
    onError: () => toast.error('Failed to update'),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name || !form.targetAmount || parseFloat(form.targetAmount) <= 0) { toast.error('Fill in name and target amount'); return; }
    addMut.mutate({ username: currentUser.username, name: form.name, targetAmount: parseFloat(form.targetAmount), currentAmount: 0, deadline: form.deadline || undefined });
  };

  const handleContribute = goal => {
    const val = prompt(`Add to "${goal.name}" (₹${goal.currentAmount.toLocaleString('en-IN')} saved):`);
    const amt = parseFloat(val);
    if (val && amt > 0) updateMut.mutate({ id: goal.id, username: goal.username, name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount + amt, deadline: goal.deadline });
  };

  return (
    <div>
      {/* A failed request must not look like an empty list. */}
      {goalsQ?.isError && (
        navigator.onLine === false
          ? <OfflineState onRetry={() => goalsQ.refetch()} compact />
          : <ErrorState error={goalsQ.error} onRetry={() => goalsQ.refetch()} compact />
      )}
      <PageHeader
        icon={Target}
        title="Goals"
        subtitle="Track progress toward your savings milestones."
        action={
          <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
            className="n-btn n-btn-primary n-btn-sm"
            onClick={() => setShowForm(p => !p)}
          >
            <Plus size={13} /> New goal
          </motion.button>
        }
      />

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <div className="pg-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>New savings goal</span>
                <button onClick={() => setShowForm(false)} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '3px' }}><X size={14} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="n-label">Goal name</label>
                    <input className="n-input" type="text" placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="n-label">Target amount (₹)</label>
                    <input className="n-input" type="number" min="1" placeholder="100,000" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} required />
                  </div>
                  <div>
                    <label className="n-label">Deadline (optional)</label>
                    <input className="n-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={addMut.isPending} className="n-btn n-btn-primary n-btn-sm">
                    {addMut.isPending ? 'Creating…' : 'Create goal'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="n-btn n-btn-default n-btn-sm">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals */}
      {isLoading ? (
        <div className="pg-cards">
          {[1,2].map(i => <div key={i} className="n-card" style={{ padding: '20px', height: '140px' }}><div className="n-skeleton" style={{ height: '100%' }} /></div>)}
        </div>
      ) : (goals.length === 0 && !goalsQ?.isError) ? (
        <div className="n-empty">
          <div className="n-empty-icon"><Target size={28} strokeWidth={1.2} /></div>
          <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No goals yet</p>
          <p style={{ fontSize: '13px' }}>Create a savings goal to start tracking.</p>
          <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '10px' }}>
            <Plus size={12} /> New goal
          </button>
        </div>
      ) : (
        <div className="pg-cards">
          {goals.map(goal => {
            const pct  = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const done = pct >= 100;
            const barColor = done ? 'var(--green)' : pct >= 75 ? 'var(--yellow)' : 'var(--accent)';

            return (
              <motion.div
                key={goal.id}
                whileHover={{ borderColor: 'var(--border-strong)' }}
                className="n-card"
                style={{ padding: '18px' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>{goal.name}</div>
                    {goal.deadline && <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>by {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  </div>
                  <motion.button whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                    onClick={() => { if (confirm(`Delete "${goal.name}"?`)) deleteMut.mutate(goal.id); }}
                    className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px', color: 'var(--text-3)' }}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>

                {/* Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{goal.currentAmount.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    of ₹{goal.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Progress */}
                <div className="n-progress-track" style={{ marginBottom: '8px' }}>
                  <motion.div
                    className="n-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
                    style={{ background: barColor }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: done ? 'var(--green)' : 'var(--text-3)' }}>
                    {done ? 'Goal complete' : `${pct.toFixed(0)}% complete`}
                  </span>
                  {!done && (
                    <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                      onClick={() => handleContribute(goal)}
                      className="n-btn n-btn-ghost n-btn-sm" style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      <PlusCircle size={12} /> Contribute
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
