import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkle as Sparkles,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  ShareNetwork as Share2,
  TrendUp,
  TrendDown,
  Bank,
  Warning,
  Trophy,
  CurrencyInr,
  CalendarBlank,
  Hash,
  Storefront,
  Smiley,
  Confetti,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { fetchWrapped } from '../api/wrapped';
import PageHeader from '../components/ui/PageHeader';
import { getPersonalityVisual, stripEmoji } from '../lib/personality';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n) => `₹${Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/* ── Slide surfaces ───────────────────────────────────────────────────────────
   The old slides used stock blues, purples and greens (#16213e, #2d0a4e,
   #002855…) that belong to no palette in this product. Clario is one warm
   accent on near-black, and colour is reserved for money — so the slides are
   now graded along the brand ramp instead, and the only other hues that appear
   are the income/expense pair, on amounts.
   ─────────────────────────────────────────────────────────────────────────── */
const SURFACE = {
  ink:    'linear-gradient(150deg, #141014 0%, #1C1418 55%, #241608 100%)',
  ember:  'linear-gradient(150deg, #1A1420 0%, #2A1508 55%, #7A2A02 100%)',
  brand:  'linear-gradient(150deg, #2A1508 0%, #7A2A02 55%, #E85002 140%)',
  deep:   'linear-gradient(150deg, #120F12 0%, #1E1410 60%, #35190A 100%)',
};

/* One consistent way to present a slide's icon: a soft rounded medallion,
   matching the tile treatment used on the dashboard and the hero card. */
const Medallion = ({ icon: Icon, size = 64, delay = 0.2, tone = 'rgba(255,255,255,0.10)' }) => (
  <motion.div
    initial={{ scale: 0.6, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', delay, stiffness: 180, damping: 18 }}
    style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: tone,
      border: '1px solid rgba(255,255,255,0.16)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '18px',
      backdropFilter: 'blur(6px)',
    }}
  >
    <Icon size={size * 0.46} weight="fill" color="#fff" />
  </motion.div>
);

const KICKER = { fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' };

// ─── Story slides ─────────────────────────────────────────────────────────────
const buildSlides = (data) => {
  if (!data) return [];
  const slides = [];
  const persona = getPersonalityVisual(data.personality);

  // Slide 1: Big intro
  slides.push({
    id: 'intro',
    gradient: SURFACE.ember,
    content: (
      <div style={{ textAlign: 'center' }}>
        <Medallion icon={persona.Icon} size={72} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={KICKER}>Your {data.month} {data.year}</div>
          {/* the API bakes an emoji into the title — the icon above says it better */}
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px' }}>{stripEmoji(data.title)}</div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>{data.subtitle}</div>
        </motion.div>
      </div>
    ),
  });

  // Slide 2: Money in vs out
  slides.push({
    id: 'money',
    gradient: SURFACE.ink,
    content: (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ ...KICKER, marginBottom: '32px' }}>The Numbers</motion.div>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
          {[
            { label: 'Earned', value: fmt(data.totalIncome),   color: 'var(--green, #4ade80)', Icon: TrendUp },
            { label: 'Spent',  value: fmt(data.totalExpenses), color: 'var(--red, #f43f5e)',   Icon: TrendDown },
            { label: 'Saved',  value: fmt(Math.abs(data.netSavings)),
              color: data.netSavings >= 0 ? 'var(--green, #4ade80)' : 'var(--red, #f43f5e)',
              Icon: data.netSavings >= 0 ? Bank : Warning },
          ].map(({ label, value, color, Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
              style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ marginBottom: '10px' }}>
                <Icon size={26} weight="fill" color="rgba(255,255,255,0.75)" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: '32px', padding: '12px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', display: 'inline-block' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Savings rate: </span>
          <span style={{ color: data.savingsRate >= 20 ? 'var(--green, #4ade80)' : data.savingsRate >= 0 ? '#fff' : 'var(--red, #f43f5e)', fontWeight: 700, fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>{data.savingsRate}%</span>
        </motion.div>
      </div>
    ),
  });

  // Slide 3: Top categories
  if (data.topCategories?.length > 0) {
    // one accent, stepped down in opacity — not five unrelated hues
    const bar = (i) => `rgba(232, 80, 2, ${1 - i * 0.16})`;
    slides.push({
      id: 'categories',
      gradient: SURFACE.deep,
      content: (
        <div style={{ width: '100%' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ ...KICKER, marginBottom: '24px', textAlign: 'center' }}>Where your money went</motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.topCategories.slice(0, 5).map(({ name, amount }, i) => {
              const maxAmt = data.topCategories[0].amount;
              const pct    = (amount / maxAmt) * 100;
              return (
                <motion.div key={name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: i === 0 ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      {i === 0 && <Trophy size={14} weight="fill" color="var(--brand, #E85002)" style={{ flex: '0 0 auto' }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    </span>
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} style={{ height: '100%', background: bar(i), borderRadius: '3px' }} />
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
      gradient: SURFACE.ink,
      content: (
        <div style={{ textAlign: 'center' }}>
          <Medallion icon={CurrencyInr} size={60} />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div style={KICKER}>Biggest purchase</div>
            <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--red, #f43f5e)', marginBottom: '8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.biggestTransaction.amount)}</div>
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
      gradient: SURFACE.deep,
      content: (
        <div style={{ textAlign: 'center' }}>
          <Medallion icon={CalendarBlank} size={60} />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div style={KICKER}>Your most expensive day</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{new Date(data.worstSpendingDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--red, #f43f5e)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.worstSpendingDay.amount)}</div>
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
      gradient: SURFACE.brand,
      content: (
        <div style={{ textAlign: 'center' }}>
          <Medallion icon={persona.Icon} size={76} tone="rgba(255,255,255,0.14)" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div style={KICKER}>Your financial personality</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>{stripEmoji(data.personality.title)}</div>
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>{data.personality.description}</div>
          </motion.div>
        </div>
      ),
    });
  }

  // Slide 7: Transactions summary
  slides.push({
    id: 'stats',
    gradient: SURFACE.ink,
    content: (
      <div style={{ textAlign: 'center', width: '100%' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ ...KICKER, marginBottom: '32px' }}>Stats</motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Transactions', value: data.transactionCount, Icon: Hash },
            { label: 'Days logged', value: data.transactionCount > 0 ? Math.min(data.transactionCount * 2, 30) : 0, Icon: CalendarBlank },
            data.topMerchant && { label: 'Favourite spot', value: data.topMerchant.name, Icon: Storefront },
            data.dominantMood && { label: 'Most common mood', value: data.dominantMood.mood, Icon: Smiley },
          ].filter(Boolean).map(({ label, value, Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
              style={{ padding: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={22} weight="fill" color="rgba(255,255,255,0.6)" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px', textTransform: label === 'Most common mood' ? 'capitalize' : 'none' }}>{value}</div>
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
    gradient: SURFACE.ember,
    content: (
      <div style={{ textAlign: 'center' }}>
        <Medallion icon={Confetti} size={60} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>That was {data.month}!</div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '24px' }}>
            {data.netSavings >= 0
              ? `You saved ${fmt(data.netSavings)} this month. That's ${fmt(data.netSavings * 12)} a year if you keep it up.`
              : `You overspent by ${fmt(Math.abs(data.netSavings))} this month. A new month is a fresh start.`}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Check AI Insights for personalised advice →</div>
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
  const persona = getPersonalityVisual(data?.personality);
  // A month with nothing in it has no story to tell. The API still returns a
  // default title ('The Balanced One'), which read as a verdict on a month the
  // user simply hadn't logged yet — so gate the whole recap on real data.
  const hasData = (data?.transactionCount ?? 0) > 0;

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
    const text = `My ${MONTHS[month]} ${year} Finance Wrapped\n`
      + `Earned: ${fmt(data?.totalIncome)}\n`
      + `Spent: ${fmt(data?.totalExpenses)}\n`
      + `Saved: ${fmt(data?.netSavings)}\n`
      + `${stripEmoji(data?.personality?.title)}\n\n`
      + `Tracked with Clario`;
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
            background: hasData ? SURFACE.brand : SURFACE.ink,
            boxShadow: hasData ? '0 24px 70px rgba(232,80,2,0.24)' : '0 24px 70px rgba(0,0,0,0.35)',
          }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,138,61,0.45), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0, 300px)', gap: '32px', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '14px' }}>
                {MONTHS[month]} {year} · Wrapped
              </div>
              <div style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                {hasData ? stripEmoji(data?.title) : 'Nothing to wrap up yet.'}
              </div>
              <div style={{ fontSize: '15px', opacity: 0.75, lineHeight: 1.6, maxWidth: '440px', marginBottom: '26px' }}>
                {hasData
                  ? data?.subtitle
                  : `No transactions recorded for ${MONTHS[month]} ${year}. Add a few — or import a statement — and your recap will build itself.`}
              </div>

              {hasData && (
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
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {hasData ? (
                  <>
                    <button onClick={() => setStarted(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '999px', border: 'none', background: '#fff', color: '#1A1420', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                      <Sparkles size={15} weight="fill" /> View Wrapped
                    </button>
                    <button onClick={handleShare}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <Share2 size={15} weight="fill" /> Share
                    </button>
                  </>
                ) : (
                  <a href="/transactions"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '999px', border: 'none', background: '#fff', color: '#1A1420', fontSize: '14px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
                    Add a transaction
                  </a>
                )}
              </div>
            </div>

            <div style={{
              justifySelf: 'center', width: 168, height: 168, borderRadius: '28px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
            }}>
              <persona.Icon size={78} weight="fill" color="#fff" />
            </div>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
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
              <button onClick={goPrev} aria-label="Previous slide" style={{ position: 'absolute', left: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-float)', color: 'var(--text-2)' }}>
                <ChevronLeft size={16} />
              </button>
            )}
            {slide < slides.length - 1 && (
              <button onClick={goNext} aria-label="Next slide" style={{ position: 'absolute', right: '-50px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-float)', color: 'var(--text-2)' }}>
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{slide + 1} / {slides.length}</span>
            <button className="n-btn n-btn-default n-btn-sm" onClick={() => { setStarted(false); setSlide(0); }}>
              <ArrowCounterClockwise size={13} /> Restart
            </button>
            <button className="n-btn n-btn-default n-btn-sm" onClick={handleShare}><Share2 size={13} /> Share</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WrappedPage;
