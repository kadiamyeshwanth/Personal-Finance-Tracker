import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Calendar, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { fetchJournal, createJournalEntry, deleteJournalEntry } from '../api/journal';
import PageHeader from '../components/ui/PageHeader';
import toast from 'react-hot-toast';

const MOODS = [
  { key: 'happy',    emoji: '😊', label: 'Happy'   },
  { key: 'excited',  emoji: '🤩', label: 'Excited' },
  { key: 'neutral',  emoji: '😐', label: 'Neutral' },
  { key: 'bored',    emoji: '😑', label: 'Bored'   },
  { key: 'stressed', emoji: '😰', label: 'Stressed'},
  { key: 'anxious',  emoji: '😟', label: 'Anxious' },
  { key: 'sad',      emoji: '😢', label: 'Sad'     },
];

const PROMPTS = [
  'What did I spend money on today and was it worth it?',
  'What financial goal am I working towards right now?',
  'Did I make any impulse purchases today?',
  'How do I feel about my finances today?',
  'What would I do differently with my money this week?',
  'Am I on track with my budget this month?',
];

const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

const JournalPage = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [content, setContent]     = useState('');
  const [mood, setMood]           = useState('neutral');
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['journal'], queryFn: fetchJournal });

  const createMut = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); setShowForm(false); setContent(''); toast.success('Journal entry saved!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save.'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); setSelectedEntry(null); toast.success('Entry deleted.'); },
  });

  const handleSave = () => {
    if (!content.trim()) return toast.error('Write something first!');
    createMut.mutate({ content: content.trim(), mood, date });
  };

  // Calendar helpers
  const calStart   = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const calEnd     = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const entryDates = new Set(entries.map(e => new Date(e.date).toDateString()));

  const calDays = [];
  const firstDay = calStart.getDay();
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= calEnd.getDate(); d++) calDays.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const totalSpent  = entries.reduce((s, e) => s + (e.totalSpentToday || 0), 0);
  const totalEarned = entries.reduce((s, e) => s + (e.totalIncomeToday || 0), 0);

  return (
    <div>
      <PageHeader icon={BookOpen} title="Financial Journal" subtitle="Reflect on your money habits. Build self-awareness day by day.">
        <button className="n-btn n-btn-primary n-btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Write Today's Entry
        </button>
      </PageHeader>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Entries', value: entries.length, icon: BookOpen, color: 'var(--accent)' },
          { label: 'Total Tracked Spending', value: fmt(totalSpent), icon: TrendingDown, color: 'var(--red)' },
          { label: 'Total Tracked Income', value: fmt(totalEarned), icon: TrendingUp, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={14} style={{ color }} />
              <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Calendar */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => { const d = new Date(viewMonth); d.setMonth(d.getMonth() - 1); setViewMonth(d); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px' }}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
            <button onClick={() => { const d = new Date(viewMonth); d.setMonth(d.getMonth() + 1); setViewMonth(d); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px' }}><ChevronRight size={14} /></button>
          </div>
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 500, color: 'var(--text-3)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const hasEntry = entryDates.has(day.toDateString());
                const isToday  = day.toDateString() === new Date().toDateString();
                return (
                  <div key={i} onClick={() => { if (hasEntry) { const e = entries.find(e => new Date(e.date).toDateString() === day.toDateString()); setSelectedEntry(e); } else { setDate(day.toISOString().slice(0,10)); setShowForm(true); } }}
                    style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', fontWeight: isToday ? 700 : 400, background: hasEntry ? 'var(--accent)' : isToday ? 'var(--bg-secondary)' : 'transparent', color: hasEntry ? '#fff' : isToday ? 'var(--text)' : 'var(--text-2)', border: isToday && !hasEntry ? '1px solid var(--border)' : '1px solid transparent', transition: 'all 0.1s' }}>
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-3)' }}>
            🔵 = has journal entry · Click empty day to write
          </div>
        </div>

        {/* Entry list / selected entry */}
        <div>
          {selectedEntry ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    {MOODS.find(m => m.key === selectedEntry.mood)?.emoji || '📔'} {new Date(selectedEntry.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {(selectedEntry.totalSpentToday > 0 || selectedEntry.totalIncomeToday > 0) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                      Spent: {fmt(selectedEntry.totalSpentToday)} · Earned: {fmt(selectedEntry.totalIncomeToday)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => deleteMut.mutate(selectedEntry._id)} className="n-btn n-btn-danger-ghost n-btn-sm"><Trash2 size={12} /></button>
                  <button onClick={() => setSelectedEntry(null)} className="n-btn n-btn-default n-btn-sm">← Back</button>
                </div>
              </div>
              <div style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: '200px' }}>
                {selectedEntry.content}
              </div>
            </motion.div>
          ) : (
            isLoading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div> :
            entries.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📔</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Start your financial journal</div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>Daily reflection builds financial awareness and better habits.</div>
                <button className="n-btn n-btn-primary n-btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> Write first entry</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.slice(0, 20).map((e, i) => {
                  const moodData = MOODS.find(m => m.key === e.mood);
                  return (
                    <motion.div key={e._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedEntry(e)}
                      style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'var(--bg)', transition: 'background 0.15s' }}
                      className="hover-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{moodData?.emoji || '📔'}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        {e.totalSpentToday > 0 && <span style={{ fontSize: '12px', color: 'var(--red)' }}>-{fmt(e.totalSpentToday)}</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.content}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Write Entry Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: '560px', maxWidth: 'calc(100vw - 32px)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>New Journal Entry</span>
              </div>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: '36px' }}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="n-input" style={{ width: '160px', fontSize: '13px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>How are you feeling?</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {MOODS.map(m => (
                      <button key={m.key} onClick={() => setMood(m.key)}
                        style={{ padding: '6px 10px', borderRadius: 'var(--r)', border: `1px solid ${mood === m.key ? 'var(--accent)' : 'var(--border)'}`, background: mood === m.key ? 'rgba(35,131,226,0.1)' : 'var(--bg)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Your reflection</span>
                    <button onClick={() => setContent(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Sparkles size={11} /> Random prompt
                    </button>
                  </div>
                  <textarea value={content} onChange={e => setContent(e.target.value)} className="n-input" rows={6}
                    placeholder="Write your financial reflection for today…" style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.6 }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="n-btn n-btn-default n-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="n-btn n-btn-primary n-btn-sm" onClick={handleSave} disabled={createMut.isPending}>
                    {createMut.isPending ? 'Saving…' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JournalPage;
