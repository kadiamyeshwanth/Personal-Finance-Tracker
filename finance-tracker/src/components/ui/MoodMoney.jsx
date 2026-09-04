/**
 * MoodMoney — a Moodify-inspired wellbeing widget, adapted to Clario's data.
 *
 * Personal-finance research keeps landing on the same finding: spending is
 * emotional. This card pairs the daily mood the user already logs with what
 * they actually spent that day, so the pattern becomes visible — plus a light
 * "how are you today?" check-in so the data keeps flowing.
 *
 * Backend is untouched — reads /api/mood + /api/mood/correlation, writes via
 * the existing POST /api/mood.
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Smiley, SmileyMeh, SmileyNervous, SmileyBlank, SmileySad, Sparkle,
} from '@phosphor-icons/react';
import { fetchMoodHistory, logMood, fetchCorrelation } from '../../api/mood';
import { spring, stagger, prefersReducedMotion } from '../../lib/motion';
import toast from 'react-hot-toast';

const MOODS = [
  { key: 'happy',    Icon: Smiley,        label: 'Happy',    tint: 'var(--green)' },
  { key: 'neutral',  Icon: SmileyMeh,     label: 'Neutral',  tint: 'var(--brand)' },
  { key: 'stressed', Icon: SmileyNervous, label: 'Stressed', tint: '#f59e0b' },
  { key: 'bored',    Icon: SmileyBlank,   label: 'Bored',    tint: 'var(--text-3)' },
  { key: 'sad',      Icon: SmileySad,     label: 'Sad',      tint: 'var(--red)' },
];
const META = Object.fromEntries(MOODS.map(m => [m.key, m]));
const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

export default function MoodMoney() {
  const qc = useQueryClient();
  const reduced = prefersReducedMotion();
  const today = new Date().toISOString().split('T')[0];

  const { data: history = [] } = useQuery({ queryKey: ['mood'], queryFn: fetchMoodHistory, staleTime: 60_000 });
  const { data: correlation = [] } = useQuery({ queryKey: ['mood-correlation'], queryFn: fetchCorrelation, staleTime: 60_000 });

  const todayMood = history.find(m => m.date?.startsWith(today))?.mood;

  const logMut = useMutation({
    mutationFn: (mood) => logMood({ mood, date: today }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mood'] });
      qc.invalidateQueries({ queryKey: ['mood-correlation'] });
      toast.success('Mood logged');
    },
    onError: () => toast.error('Could not log mood'),
  });

  const { rows, insight } = useMemo(() => {
    const withSpend = correlation.filter(c => c.count > 0 && c.avgSpend > 0);
    const max = Math.max(...withSpend.map(c => c.avgSpend), 1);
    const rows = withSpend
      .sort((a, b) => b.avgSpend - a.avgSpend)
      .map(c => ({ ...c, meta: META[c.mood] || META.neutral, width: (c.avgSpend / max) * 100 }));

    // Only draw a conclusion from moods with enough logged days to mean something.
    const solid = rows.filter(r => r.count >= 3);
    let insight = null;
    if (solid.length >= 2) {
      const top = solid[0], low = solid[solid.length - 1];
      const ratio = low.avgSpend > 0 ? top.avgSpend / low.avgSpend : 0;
      const t = top.meta.label.toLowerCase(), l = low.meta.label.toLowerCase();
      if (ratio >= 3)        insight = `Your spending on ${t} days runs far higher than on ${l} days.`;
      else if (ratio >= 1.35) insight = `You spend about ${ratio.toFixed(1)}× more on ${t} days than on ${l} days.`;
      else                    insight = `Your spending stays fairly steady across moods — a good sign.`;
    }
    return { rows, insight };
  }, [correlation]);

  const loggedDays = history.length;

  return (
    <motion.section
      className="mm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      aria-label="Mood and money"
    >
      <header className="mm-head">
        <span className="mm-chip"><Smiley size={16} weight="fill" /></span>
        <div>
          <h2 className="mm-title">Mood &amp; Money</h2>
          <p className="mm-sub">How feelings move your spending</p>
        </div>
        {loggedDays > 0 && <span className="mm-count">{loggedDays} days logged</span>}
      </header>

      {/* Check-in */}
      <div className="mm-checkin">
        <span className="mm-checkin-q">{todayMood ? 'Today you felt' : 'How are you today?'}</span>
        <div className="mm-faces" role="group" aria-label="Log today's mood">
          {MOODS.map(({ key, Icon, label, tint }) => {
            const active = todayMood === key;
            return (
              <button
                key={key}
                type="button"
                className={`mm-face ${active ? 'is-active' : ''}`}
                style={active ? { color: tint, borderColor: tint } : undefined}
                onClick={() => logMut.mutate(key)}
                disabled={logMut.isPending}
                aria-label={label}
                aria-pressed={active}
                title={label}
              >
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Correlation */}
      {rows.length > 0 ? (
        <>
          <div className="mm-bars">
            {rows.map((r, i) => (
              <motion.div
                key={r.mood}
                className="mm-row"
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={stagger(i, 0.05)}
              >
                <span className="mm-row-face" style={{ color: r.meta.tint }}>
                  <r.meta.Icon size={15} weight="fill" />
                </span>
                <span className="mm-row-label">{r.meta.label}</span>
                <span className="mm-row-track">
                  <motion.span
                    className="mm-row-fill"
                    style={{ background: r.meta.tint }}
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${Math.max(r.width, 4)}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="mm-row-val money">{inr(r.avgSpend)}<em>/day</em></span>
              </motion.div>
            ))}
          </div>
          {insight && (
            <p className="mm-insight">
              <Sparkle size={13} weight="fill" /> {insight}
            </p>
          )}
        </>
      ) : (
        <p className="mm-empty">
          Log how you feel for a few days and Clario will show how your mood and
          your spending move together.
        </p>
      )}
    </motion.section>
  );
}
