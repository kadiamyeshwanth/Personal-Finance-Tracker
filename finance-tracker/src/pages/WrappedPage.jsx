import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkle as Sparkles,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  ShareNetwork as Share2,
  DownloadSimple as Download,
} from '@phosphor-icons/react';
import { fetchWrapped } from '../api/wrapped';
import PageHeader from '../components/ui/PageHeader';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// ─── Story slides ─────────────────────────────────────────────────────────────
const buildSlides = (data) => {
  if (!data) return [];
  const slides = [];

  // Slide 1: Big intro
  slides.push({
    id: 'intro',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    content: (
      <div style={{ textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
          style={{ fontSize: '64px', marginBottom: '16px' }}>{data.personality?.emoji || '✨'}</motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Your {data.month} {data.year}</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px' }}>{data.title}</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>{data.subtitle}</div>
        </motion.div>
      </div>
    ),
  });

  // Slide 2: Money in vs out
  slides.push({
    id: 'money',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    content: (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '32px' }}>The Numbers</motion.div>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
          {[
            { label: 'Earned', value: fmt(data.totalIncome), color: 'var(--brand)', arrow: '📈' },
            { label: 'Spent',  value: fmt(data.totalExpenses), color: '#f87171', arrow: '📉' },
            { label: 'Saved',  value: fmt(Math.abs(data.netSavings)), color: data.netSavings >= 0 ? 'var(--brand)' : '#fbbf24', arrow: data.netSavings >= 0 ? '🏦' : '⚠️' },
          ].map(({ label, value, color, arrow }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
              style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{arrow}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color, marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: '32px', padding: '12px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', display: 'inline-block' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Savings rate: </span>
          <span style={{ color: data.savingsRate >= 20 ? 'var(--brand)' : data.savingsRate >= 0 ? '#fbbf24' : '#f87171', fontWeight: 700, fontSize: '16px' }}>{data.savingsRate}%</span>
        </motion.div>
      </div>
    ),
  });

  // Slide 3: Top categories
  if (data.topCategories?.length > 0) {
    const colors = ['var(--brand)','var(--red)','#FFB866','#C94F00','#34d399'];
    slides.push({
      id: 'categories',
      gradient: 'linear-gradient(135deg, #1a0533 0%, #2d0a4e 50%, #1a0533 100%)',
      content: (
        <div style={{ width: '100%' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px', textAlign: 'center' }}>Where your money went</motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.topCategories.slice(0, 5).map(({ name, amount }, i) => {
              const maxAmt = data.topCategories[0].amount;
              const pct    = (amount / maxAmt) * 100;
              return (
                <motion.div key={name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: i === 0 ? 700 : 400 }}>{i === 0 ? '🏆 ' : ''}{name}</span>
                    <span style={{ color: colors[i], fontSize: '14px', fontWeight: 600 }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} style={{ height: '100%', background: colors[i], borderRadius: '3px' }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  // Slide 4: Biggest transaction
  if (data.biggestTransaction) {
    slides.push({
      id: 'biggest',
      gradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b00 100%)',
      content: (
        <div style={{ textAlign: 'center' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} style={{ fontSize: '56px', marginBottom: '16px' }}>💸</motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Biggest purchase</div>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fb923c', marginBottom: '8px' }}>{fmt(data.biggestTransaction.amount)}</div>
            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
              {data.biggestTransaction.merchant || data.biggestTransaction.category}
            </div>
          </motion.div>
        </div>
      ),
    });
  }

  // Slide 5: Worst spending day
  if (data.worstSpendingDay) {
    slides.push({
      id: 'worstday',
      gradient: 'linear-gradient(135deg, #1f0000 0%, #3b0000 100%)',
      content: (
        <div style={{ textAlign: 'center' }}>
          <motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ type: 'spring', delay: 0.2 }} style={{ fontSize: '56px', marginBottom: '16px' }}>📅</motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Your most expensive day</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{new Date(data.worstSpendingDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#f87171' }}>{fmt(data.worstSpendingDay.amount)}</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>spent in a single day</div>
          </motion.div>
        </div>
      ),
    });
  }

  // Slide 6: Personality
  if (data.personality && data.personality.type !== 'unknown') {
    slides.push({
      id: 'personality',
      gradient: `linear-gradient(135deg, ${data.personality.color}40 0%, ${data.personality.color}15 100%)`,
      content: (
        <div style={{ textAlign: 'center' }}>
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.2 }} style={{ fontSize: '72px', marginBottom: '16px' }}>{data.personality.emoji}</motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Your financial personality</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>{data.personality.title}</div>
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>{data.personality.description}</div>
          </motion.div>
        </div>
      ),
    });
  }

  // Slide 7: Transactions summary
  slides.push({
    id: 'stats',
    gradient: 'linear-gradient(135deg, #001429 0%, #002855 100%)',
    content: (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '32px' }}>Stats</motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Transactions', value: data.transactionCount, emoji: '🔢' },
            { label: 'Days logged', value: data.transactionCount > 0 ? Math.min(data.transactionCount * 2, 30) : 0, emoji: '📅' },
            data.topMerchant && { label: 'Favourite spot', value: data.topMerchant.name, emoji: '❤️' },
            data.dominantMood && { label: 'Most common mood', value: data.dominantMood.mood, emoji: '😊' },
          ].filter(Boolean).map(({ label, value, emoji }, i) => (
            <motion.div key={label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
              style={{ padding: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  });

  // Slide 8: Closing
  slides.push({
    id: 'end',
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    content: (
      <div style={{ textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 150 }} style={{ fontSize: '56px', marginBottom: '20px' }}>🎉</motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>That was {data.month}!</div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '24px' }}>
            {data.netSavings >= 0
              ? `You saved ${fmt(data.netSavings)} this month. That's ${fmt(data.netSavings * 12)} a year if you keep it up! 🚀`
              : `You overspent by ${fmt(Math.abs(data.netSavings))} this month. A new month is a fresh start! 💪`}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Check AI Insights for personalised advice →</div>
        </motion.div>
      </div>
    ),
  });

  return slides;
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const WrappedPage = () => {
  const now  = new Date();
  const [month, setMonth] = useState(now.getMonth());     // 0-indexed
  const [year, setYear]   = useState(now.getFullYear());
  const [slide, setSlide] = useState(0);
  const [started, setStarted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wrapped', month, year],
    queryFn: () => fetchWrapped(month, year),
  });

  const slides = buildSlides(data);
  const goNext = () => { if (slide < slides.length - 1) setSlide(s => s + 1); };
  const goPrev = () => { if (slide > 0) setSlide(s => s - 1); };

  const prevMonth = () => {
    setStarted(false); setSlide(0);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setStarted(false); setSlide(0);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleShare = () => {
    const text = `My ${MONTHS[month]} ${year} Finance Wrapped:\n💰 Earned: ${fmt(data?.totalIncome)}\n💸 Spent: ${fmt(data?.totalExpenses)}\n🏦 Saved: ${fmt(data?.netSavings)}\n${data?.personality?.emoji} ${data?.personality?.title}\n\nTracked with Personal Finance Tracker`;
    if (navigator.share) navigator.share({ title: `My ${MONTHS[month]} Wrapped`, text }).catch(() => {});
    else { navigator.clipboard.writeText(text); toast.success('Summary copied to clipboard!'); }
  };

  return (
    <div>
      <PageHeader icon={Sparkles} title="Monthly Wrapped" subtitle="Your Spotify-style financial story. See what defined your month.">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevMonth} className="n-btn n-btn-default n-btn-sm"><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', minWidth: '120px', textAlign: 'center' }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="n-btn n-btn-default n-btn-sm" disabled={month === now.getMonth() && year === now.getFullYear()}><ChevronRight size={14} /></button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Sparkles size={28} style={{ color: 'var(--brand)' }} />
          </motion.div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Generating your Wrapped…</div>
        </div>
      ) : isError ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>Could not load Wrapped for this month.</div>
      ) : !started ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)',
            padding: 'clamp(28px, 5vw, 48px)', color: '#fff',
            background: 'linear-gradient(140deg, #1A1420 0%, #2A1508 45%, #E85002 140%)',
            boxShadow: '0 24px 70px rgba(232,80,2,0.24)',
          }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,138,61,0.45), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0, 300px)', gap: '32px', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '14px' }}>
                {MONTHS[month]} {year} · Wrapped
              </div>
              <div style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                {data?.title || `Your month in ${data?.transactionCount || 0} moves.`}
              </div>
              <div style={{ fontSize: '15px', opacity: 0.75, lineHeight: 1.6, maxWidth: '440px', marginBottom: '26px' }}>
                {data?.subtitle || 'A short, Spotify-style recap of where the money went — built from your own transactions.'}
              </div>
              <div style={{ display: 'flex', gap: '18px', marginBottom: '28px', flexWrap: 'wrap' }}>
                {[
                  { k: 'Transactions', v: data?.transactionCount ?? 0 },
                  { k: 'Categories', v: data?.topCategories?.length ?? 0 },
                  { k: 'Slides', v: slides.length },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginTop: '4px' }}>{k}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setStarted(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '999px', border: 'none', background: '#fff', color: '#1A1420', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  <Sparkles size={15} weight="fill" /> View Wrapped
                </button>
                <button onClick={handleShare}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  <Share2 size={15} weight="fill" /> Share
                </button>
              </div>
            </div>
            <div style={{
              justifySelf: 'center', width: 168, height: 168, borderRadius: '28px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '84px',
              backdropFilter: 'blur(6px)',
            }}>
              {data?.personality?.emoji || '✨'}
            </div>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                style={{ width: slide === i ? '20px' : '6px', height: '6px', borderRadius: '3px', border: 'none', background: slide === i ? 'var(--brand)' : 'var(--border)', cursor: 'pointer', transition: 'all 0.2s' }} />
            ))}
          </div>

          {/* Story card */}
          <div style={{ width: '100%', maxWidth: '540px', position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div key={slide}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                style={{
                  borderRadius: '20px', overflow: 'hidden', padding: '48px 40px',
                  background: slides[slide]?.gradient, minHeight: '420px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}>
                {slides[slide]?.content}
              </motion.div>
            </AnimatePresence>

            {/* Side nav buttons */}
            {slide > 0 && (
              <button onClick={goPrev} style={{ position: 'absolute', left: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-float)', color: 'var(--text-2)' }}>
                <ChevronLeft size={16} />
              </button>
            )}
            {slide < slides.length - 1 && (
              <button onClick={goNext} style={{ position: 'absolute', right: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-float)', color: 'var(--text-2)' }}>
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>{slide + 1} / {slides.length}</span>
            <button className="n-btn n-btn-default n-btn-sm" onClick={() => { setStarted(false); setSlide(0); }}>↩ Restart</button>
            <button className="n-btn n-btn-default n-btn-sm" onClick={handleShare}><Share2 size={13} /> Share</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WrappedPage;
