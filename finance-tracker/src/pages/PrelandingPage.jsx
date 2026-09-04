/**
 * PrelandingPage — Clario's public front door.
 *
 * Section arc follows the Meridian reference (metrics in styles/meridian.css):
 *   hero (bleed sphere) → logo marquee → case slider → pinned scroll-scatter
 *   → detailed bento (per-card backgrounds + parallax) → dot divider
 *   → 3-step "see it move" → dot divider → big testimonials carousel
 *   → CTA → footer (sphere cresting the edge)
 *
 * Copy, palette and product surfaces are Clario's own.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Lenis from 'lenis';
import {
  motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate, useSpring,
} from 'framer-motion';
import {
  ArrowRight, ArrowLeft, DeviceMobile, FileCsv, Receipt, PencilSimple,
  ShieldCheck, Lock, Export, Eye, Sparkle, ChartPie, Bank, Lightning,
  ArrowsClockwise, Quotes, Wallet, Target, Bell, TrendUp, Storefront,
  ChatCircleDots, CheckCircle, Circle, CaretRight,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { LogoMark, LogoWordmark } from '../components/ui/Logo';
import { Globe, GLOBE_CONFIG } from '../components/ui/globe';
import { GlobePolaroids } from '../components/ui/globe-polaroids';
import Illustration from '../components/ui/Illustration';
import { CrowdCanvas } from '../components/ui/crowd-canvas';

/* the footer globe sits on near-black — hotter markers + a warmer glow than
   the one on the white hero, and near-equatorial so it reads as cresting the
   footer edge */
const FOOTER_GLOBE = {
  ...GLOBE_CONFIG,
  dark: 1,
  theta: 0.1,
  baseColor: [0.9, 0.55, 0.35],
  markerColor: [1, 0.45, 0.16],
  glowColor: [0.55, 0.32, 0.2],
};

/* ── content ──────────────────────────────────────────────────────────── */
const NAV = [
  { id: 'capture',  label: 'Capture' },
  { id: 'platform', label: 'Platform' },
  { id: 'how',      label: 'How it works' },
  { id: 'proof',    label: 'Proof' },
  { id: 'faq',      label: 'FAQ' },
];

/* the running Lenis instance, so hash-nav can hand the jump to Lenis and keep
   the same easing as a wheel scroll */
let lenisRef = null;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisRef) {
    lenisRef.scrollTo(el, { offset: -84, duration: 1.1 });
    history.replaceState(null, '', `#${id}`);
    return;
  }
  const scroller = document.scrollingElement || document.documentElement;
  const target = el.getBoundingClientRect().top + scroller.scrollTop - 84;
  const start = scroller.scrollTop;
  const dist = target - start;
  if (Math.abs(dist) < 4) return;
  const dur = Math.min(850, 320 + Math.abs(dist) * 0.12);
  const t0 = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    scroller.scrollTop = start + dist * ease(t);
    if (t < 1) requestAnimationFrame(step);
    else history.replaceState(null, '', `#${id}`);
  };
  requestAnimationFrame(step);
}
const onNavClick = (id) => (e) => { e.preventDefault(); scrollToId(id); };

const MARQUEE = [
  { Icon: Bank,         k: 'HDFC' },
  { Icon: Bank,         k: 'ICICI' },
  { Icon: Bank,         k: 'SBI' },
  { Icon: Bank,         k: 'Axis' },
  { Icon: FileCsv,      k: 'CSV statements' },
  { Icon: DeviceMobile, k: 'Bank SMS' },
  { Icon: Receipt,      k: 'Receipt photos' },
  { Icon: PencilSimple, k: 'Manual entry' },
];

const SLIDES = [
  { metric: '4 taps',  k: 'Bank SMS',
    d: 'Forward the alerts your bank already sends. Amount, merchant and date are parsed and filed for you.' },
  { metric: '1 drop',  k: 'CSV statement',
    d: 'Drop in a statement from HDFC, ICICI, SBI or Axis. The columns map themselves and duplicates are caught.' },
  { metric: '1 photo', k: 'Receipt scan',
    d: 'Snap it. Total, merchant and date come off the image and land in the right category.' },
  { metric: '2 taps',  k: 'By hand',
    d: 'For the days you just want it done. Amount, category, save — and the dashboard updates.' },
];


const STEPS = [
  { n: '01', l: 'Connect nothing',   p: 'No bank login, no OAuth screen. Import a statement or forward an SMS and the dashboard already has something to say.' },
  { n: '02', l: 'The ten-second check', p: 'Once a week, glance at one figure in, one figure out, and the category that crept up. That is the whole ritual.' },
  { n: '03', l: 'Read the recap',     p: 'At month end, a page worth opening: what moved, what held, and the single thing to watch next month.' },
];

/* testimonials — SAMPLE COPY, swap for real quotes before launch.
   `tone`: 'grid' = big card with the faint grid texture · 'flame' = warm fill ·
   'dark' = ink card. Order matches the three-column layout below. */
const TESTI = [
  { tone: 'grid',  img: '/media/testi/p1.jpg',
    q: 'I’d bounced off three trackers before this. It never asks me to do homework — I forward one SMS and the month is just there.',
    by: 'Ananya R.', role: 'Freelance designer, Bengaluru' },
  { tone: 'flame', img: '/media/testi/p2.jpg',
    q: 'The budget warning hit two days before I’d have overspent on Shopping. First app that’s actually saved me money instead of just showing me the damage.',
    by: 'Karthik M.', role: 'Product manager, Gurugram' },
  { tone: 'dark',  img: '/media/testi/p3.jpg',
    q: 'No bank login was the whole reason I tried it. The CSV import reads my HDFC statement better than HDFC’s own app does.',
    by: 'Priya S.', role: 'Chartered accountant, Pune' },
  { tone: 'dark',  img: '/media/testi/p4.jpg',
    q: 'Ten seconds on Sunday and I know where the month went. That’s the entire relationship, and it’s exactly enough.',
    by: 'Rahul D.', role: 'Founder, Bengaluru' },
  { tone: 'dark',  img: '/media/testi/p5.jpg',
    q: 'I finally stuck with a tracker past week two. The monthly recap is the only finance email I actually open.',
    by: 'Meera N.', role: 'Doctor, Kochi' },
  { tone: 'flame', img: '/media/testi/p6.jpg',
    q: 'It caught a subscription I’d forgotten since 2022. Paid for itself the first month.',
    by: 'Aditya V.', role: 'Analyst, Mumbai' },
  { tone: 'grid',  img: '/media/testi/p7.jpg',
    q: 'The dashboard is one screen, not forty. My partner and I both check it now — which never happened with a spreadsheet.',
    by: 'Sana K.', role: 'Design lead, Hyderabad' },
];

/* ── motion presets ───────────────────────────────────────────────────── */
/* One soft ease everywhere. Durations are deliberately long — the brief was
   "butter smooth", and a 0.6s reveal on a section this large reads as a snap. */
const SOFT = [0.33, 1, 0.42, 1];
const rise = (i = 0) => ({
  initial: { opacity: 0, y: 30, filter: 'blur(7px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 1.15, delay: i * 0.11, ease: SOFT },
});
const pop = (i = 0) => ({
  initial: { opacity: 0, y: 50, filter: 'blur(14px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 1.05, delay: i * 0.1, ease: SOFT },
});

/**
 * useScrollProgress — 0…1 as `ref` moves through the viewport.
 *
 * Not framer's `useScroll`: on this page `body` is the scroll container, not
 * `html`, so `window.scrollY` is frozen at 0 and every window-based scroll
 * hook reads 0. Measuring the element's own rect is agnostic to which box
 * scrolls; the rAF loop only runs while the section is on screen.
 *
 *   'through' — 0 when the top pins, 1 when the bottom arrives (pinned sections)
 *   'exit'    — 0 at rest, 1 once a full element height has scrolled past
 *   'cover'   — 0 as the bottom enters, 1 as the top leaves (parallax range)
 */
function useScrollProgress(ref, mode = 'through') {
  const progress = useMotionValue(mode === 'cover' ? 0.5 : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      progress.set(mode === 'through' ? 0.5 : mode === 'cover' ? 0.5 : 0);
      return undefined;
    }
    let raf = 0, running = false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      let v;
      if (mode === 'cover') v = (vh - r.top) / (vh + r.height);
      else {
        const span = mode === 'exit' ? r.height : r.height - vh;
        v = span > 0 ? -r.top / span : 0;
      }
      progress.set(Math.min(1, Math.max(0, v)));
      if (running) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { rootMargin: '15% 0px' });
    io.observe(el);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, [ref, progress, mode]);
  return progress;
}

/* ── Premium masked text reveal (Meridian-style) ─────────────────────────
   Each line sits in an overflow:hidden mask; the inner span starts fully
   below (y:110%) at reduced opacity + a hair of blur, then rises and
   *settles* on an expo-out curve with a tight, connected stagger. The
   trigger is on the unclipped wrapper (a per-span viewport check never
   fires — the span starts pushed out of its own box). */
const REVEAL_PARENT = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.14, delayChildren: 0 } },
};
const REVEAL_CHILD = {
  hidden: { y: '0.42em', opacity: 0, filter: 'blur(12px)' },
  shown: {
    y: '0em', opacity: 1, filter: 'blur(0px)',
    transition: { duration: 1.25, ease: SOFT },
  },
};

/* per-card copy: label → title → body rise in sequence when the card enters */
const FEAT_COPY_PARENT = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.18, delayChildren: 0.05 } },
};
const FEAT_COPY_CHILD = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.05, ease: SOFT } },
};

function Lines({ lines, className = 'mr-t2', delay = 0, as: Tag = motion.h2 }) {
  return (
    <Tag
      className={className}
      variants={REVEAL_PARENT} initial="hidden" whileInView="shown"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delayChildren: delay }}
    >
      {lines.map((l, i) => (
        <span className="mr-line" key={`${l}-${i}`}>
          <motion.span variants={REVEAL_CHILD}>{l}</motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* Word-level masked reveal for body copy. `parts` is a list of
   { t } plain words or { t, u:true } underlined key words. */
function Reveal({ parts, className = 'mr-body', delay = 0, as: Tag = motion.p }) {
  return (
    <Tag
      className={`mr-reveal ${className}`.trim()}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      initial="hidden" whileInView="shown"
      viewport={{ once: true, amount: 0.35 }}
    >
      {parts.map((p, i) => (
        <span className="mr-reveal-w" key={i}>
          <motion.span
            className={p.u ? 'mr-reveal-i mr-reveal-u' : 'mr-reveal-i'}
            variants={{
              hidden: { y: '0.42em', opacity: 0, filter: 'blur(12px)' },
              shown: { y: '0%', opacity: 1, filter: 'blur(0px)', transition: { duration: 1.05, ease: SOFT } },
            }}
          >{p.t}</motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* one strong headline, each line blur-ups in on load — no cycling (a phrase
   caught mid-transition just reads as broken) */
const HERO_HEADLINE = ['Where the month', 'actually went.'];
function CyclingHeadline() {
  return (
    <h1 className="mr-t2 mr-hero-h1">
      <span className="mr-hero-h1-inner">
        {HERO_HEADLINE.map((line, k) => (
          <span className="mr-line" key={line}>
            <motion.span
              initial={{ opacity: 0, y: '112%', filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: '0%', filter: 'blur(0px)' }}
              transition={{ duration: 1.6, delay: 0.12 + k * 0.1, ease: SOFT }}
            >{line}</motion.span>
          </span>
        ))}
      </span>
    </h1>
  );
}

/* ── product mockups — real DOM, sharp, never stale ───────────────────── */
const Plot = ({ values, on }) => (
  <div className="mr-plot">
    {values.map((v, i) => (
      <motion.i
        key={i} className={on(i) ? 'on' : ''} style={{ height: `${v}%` }}
        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.95, delay: 0.15 + i * 0.055, ease: SOFT }}
      />
    ))}
  </div>
);

const OverviewMock = () => (
  <div className="mr-mock">
    <div className="mr-mock-bar"><i /><i /><i /><span>Overview · September</span></div>
    <div className="mr-mock-body">
      <div className="mr-tiles">
        <div className="mr-tile mr-tile--on"><b>Balance</b><span>₹2,31,450</span></div>
        <div className="mr-tile"><b>Income</b><span>₹1,99,500</span></div>
        <div className="mr-tile"><b>Saved</b><span>47%</span></div>
      </div>
      <div className="mr-well mr-plot-card">
        <div className="mr-plot-head"><b>Cash flow</b><span>Net +₹1,13,460</span></div>
        <Plot values={[34, 52, 41, 68, 47, 83, 59, 92, 71, 64, 88, 76]} on={i => i % 3 === 1} />
      </div>
    </div>
  </div>
);

const BudgetMock = () => (
  <div className="mr-mock">
    <div className="mr-mock-bar"><i /><i /><i /><span>Budgets</span></div>
    <div className="mr-mock-body">
      <div className="mr-prog">
        {[
          { l: 'Groceries', v: '₹8,200 / ₹10,000', p: 82 },
          { l: 'Shopping',  v: '₹12,150 / ₹5,000', p: 100, over: true },
          { l: 'Transport', v: '₹2,400 / ₹4,000',  p: 60 },
          { l: 'Dining',    v: '₹3,050 / ₹6,000',  p: 51 },
        ].map((b, i) => (
          <div className="mr-prog-i" key={b.l}>
            <b>{b.l}</b><small>{b.v}</small>
            <div className="mr-prog-track">
              <motion.div
                className={`mr-prog-fill${b.over ? ' is-over' : ''}`}
                initial={{ scaleX: 0 }} whileInView={{ scaleX: b.p / 100 }} viewport={{ once: true }}
                transition={{ duration: 1.25, delay: 0.18 + i * 0.13, ease: SOFT }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AskMock = () => (
  <div className="mr-mock">
    <div className="mr-mock-bar"><i /><i /><i /><span>Ask Clario</span></div>
    <div className="mr-mock-body">
      <div className="mr-chat">
        <div className="mr-msg mr-msg--me">Why was September worse than August?</div>
        <div className="mr-msg mr-msg--them">
          Spending rose <strong>₹18,400</strong> — almost all Shopping, three orders in one
          week against a ₹5,000 budget. Everything else held.
        </div>
        <div className="mr-msg mr-msg--me">What should I do about it?</div>
        <div className="mr-msg mr-msg--them">
          Raise the Shopping budget to <strong>₹8,000</strong> or set a 2-order weekly cap —
          the cap keeps your savings rate at 47%.
        </div>
      </div>
    </div>
  </div>
);

const RowsMock = () => (
  <div className="mr-rows">
    {[
      { Icon: Receipt,      l: 'Blue Tokai · Coffee', v: '−₹480' },
      { Icon: Bank,         l: 'Salary · Sep',        v: '+₹1,99,500' },
      { Icon: DeviceMobile, l: 'Jio · Recharge',      v: '−₹399' },
      { Icon: Storefront,   l: 'Amazon · Shopping',   v: '−₹4,150' },
    ].map(r => (
      <div className="mr-row" key={r.l}>
        <r.Icon size={16} weight="fill" /><span>{r.l}</span><b>{r.v}</b>
      </div>
    ))}
  </div>
);

/* the "detailed" surfaces the reference leans on */
const ProdMock = () => (
  <div className="mr-prod">
    <div className="mr-prod-top">
      <span className="mr-prod-badge"><TrendUp size={11} weight="bold" /> +₹7,150</span>
      <span className="mr-prod-tag">Watch this</span>
    </div>
    <div className="mr-prod-body">
      <b>Amazon · Shopping</b>
      <div className="mr-prod-row">
        <span className="p">₹12,150</span>
        <span className="sku">3 ORDERS</span>
        <span className="star">over ₹5,000 budget</span>
      </div>
    </div>
  </div>
);

const DataTableMock = () => (
  <div className="mr-datatable">
    <div className="mr-datatable-h"><span>Category</span><span>Spent</span><span>vs Aug</span></div>
    {[
      { c: 'Groceries', s: '₹8,200',  d: '−4%',  up: false },
      { c: 'Shopping',  s: '₹12,150', d: '+61%', up: true },
      { c: 'Transport', s: '₹2,400',  d: '−12%', up: false },
      { c: 'Dining',    s: '₹3,050',  d: '+8%',  up: true },
    ].map(r => (
      <div className="mr-datatable-r" key={r.c}>
        <span>{r.c}</span><b>{r.s}</b>
        <span className={`mr-delta ${r.up ? 'down' : 'up'}`}>{r.d}</span>
      </div>
    ))}
  </div>
);

const DropMock = () => (
  <div className="mr-drop">
    <div className="mr-drop-h"><span className="k">By category</span><CaretRight size={13} /></div>
    {[
      { b: 'Needs',  s: '₹94,200 · 63% of spend' },
      { b: 'Wants',  s: '₹38,400 · 26% of spend' },
      { b: 'Saved',  s: '₹16,900 · 11% of income' },
    ].map(r => (
      <div className="mr-drop-i" key={r.b}><b>{r.b}</b><span>{r.s}</span></div>
    ))}
  </div>
);

const ChatBoxMock = () => (
  <div className="mr-chatbox">
    <div className="mr-chatbox-in">
      What can I cut without noticing?
      <span className="go"><ArrowRight size={13} weight="bold" /></span>
    </div>
    <div className="mr-chatbox-sug">
      <span className="lbl">Suggested</span>
      <button type="button">Which subscription have I not used since June?</button>
      <button type="button">Am I on track to save ₹2L this year?</button>
    </div>
  </div>
);

const Ring = ({ pct = 47, label = '47%' }) => {
  const c = 2 * Math.PI * 40;
  return (
    <div className="mr-ring">
      <svg viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="40" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="7" />
        <motion.circle
          cx="46" cy="46" r="40" fill="none" stroke="#E85002" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - pct / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: SOFT }}
        />
      </svg>
      <span className="mr-ring-val">{label}</span>
    </div>
  );
};

/* each capture card shows a small true-to-life representation of that input */
const CAP_ICON = [DeviceMobile, FileCsv, Receipt, PencilSimple];
const CAP_VIEW = [
  // Bank SMS — a parsed alert
  () => (
    <div className="mr-cap-view mr-cap-view--sms">
      <p className="mr-cap-raw">HDFC: Rs 480.00 debited to BLUE TOKAI on 14-09. Avl bal Rs 2,31,450.</p>
      <div className="mr-cap-parsed">
        <span><em>Merchant</em>Blue Tokai</span>
        <span><em>Amount</em>−₹480</span>
        <span><em>Category</em>Coffee</span>
      </div>
    </div>
  ),
  // CSV — columns snapping into place
  () => (
    <div className="mr-cap-view mr-cap-view--csv">
      {[['01 Sep', 'Salary', '+₹1,99,500'], ['03 Sep', 'Jio', '−₹399'], ['07 Sep', 'Amazon', '−₹4,150']].map(r => (
        <div className="mr-cap-row" key={r[0]}><span>{r[0]}</span><span>{r[1]}</span><b>{r[2]}</b></div>
      ))}
      <p className="mr-cap-note">4 columns mapped · 2 duplicates skipped</p>
    </div>
  ),
  // Receipt — image → fields
  () => (
    <div className="mr-cap-view mr-cap-view--rcpt">
      <div className="mr-cap-slip"><i /><i /><i /><b>TOTAL ₹1,240</b></div>
      <div className="mr-cap-parsed">
        <span><em>Store</em>More Supermarket</span>
        <span><em>Date</em>14 Sep</span>
      </div>
    </div>
  ),
  // By hand — the two-tap entry
  () => (
    <div className="mr-cap-view mr-cap-view--hand">
      <div className="mr-cap-field"><em>Amount</em><b>₹ 320</b></div>
      <div className="mr-cap-chips">{['Groceries', 'Transport', 'Dining'].map((c, i) => (
        <span key={c} className={i === 1 ? 'on' : ''}>{c}</span>
      ))}</div>
      <div className="mr-cap-save">Save →</div>
    </div>
  ),
];

/* ── capture: shadergradient band, rolling glass cards, parallax on scroll ── */
function CaptureSection() {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'cover');
  const headY = useTransform(p, [0, 1], [28, -28]);
  const rollY = useTransform(p, [0, 1], [-36, 36]);
  const footY = useTransform(p, [0, 1], [56, -24]);
  const reel = [...SLIDES, ...SLIDES];
  return (
    <section className="mr-section mr-cap-sec" id="capture" ref={ref}>
      <div className="mr-container">
        <motion.div className="mr-head" style={{ y: headY }}>
          <div className="mr-head-title">
            <Lines lines={['Four ways in.', 'None want a password.']} />
          </div>
          <motion.div className="mr-head-aside" {...rise(1)}>
            <p className="mr-body">
              Every route exists for one reason — get the data in without making you
              type it, and without handing anyone your credentials.
            </p>
          </motion.div>
        </motion.div>

        <motion.div className="mr-roll" style={{ y: rollY }}>
          <div className="mr-roll-viewport" aria-label="Ways to get your data in">
            <div className="mr-roll-track">
              {reel.map((s, k) => {
                const i = k % SLIDES.length;
                const View = CAP_VIEW[i];
                const Icon = CAP_ICON[i];
                return (
                  <article className="mr-slide" key={`${s.k}-${k}`} aria-hidden={k >= SLIDES.length}>
                    <div className="mr-slide-head">
                      <span className="mr-slide-ic"><Icon size={16} weight="fill" /></span>
                      <p className="mr-label">{s.k}</p>
                    </div>
                    <div className="mr-slide-art"><View /></div>
                    <div className="mr-slide-body">
                      <div className="mr-slide-metric">{s.metric}</div>
                      <p>{s.d}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div className="mr-slider-foot" style={{ y: footY }}>
          <Link to="/login" className="mr-btn mr-btn--light">
            Try it with your data <ArrowRight size={14} weight="bold" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── pinned scroll: eight product chips bloom out of the centre on a ring,
   revealing the headline as the middle clears (adapted from the reference's
   circle-expand scroller — our palette, our copy, scroll-progress driven so it
   works with this app's body-scroll container). ─────────────────────────── */
/* the varied product cards that fan out — a stat, a spark, a message, a couple
   of rows — so it reads as the product, not a chip grid */
const ORBIT = [
  { type: 'stat',  Icon: Wallet,  k: 'Balance',    v: '₹2,31,450', d: 'every account' },
  { type: 'spark', k: 'Net · September', v: '+₹1,13,460', bars: [34, 52, 46, 68, 60, 84, 74] },
  { type: 'stat',  Icon: ChartPie, k: 'Saved this month', v: '47%', d: '+6 on August', up: true },
  { type: 'chat',  q: 'Where did ₹18,400 go?', a: 'Shopping — three orders, one week.' },
  { type: 'stat',  Icon: Lock,    k: 'Bank logins', v: '0', d: 'now or ever' },
  { type: 'rows',  k: 'Just landed', rows: [['Blue Tokai', '−₹480'], ['Salary', '+₹1,99,500']] },
  { type: 'prog',  k: 'Budgets', items: [['Groceries', 82], ['Shopping', 100]] },
  { type: 'stat',  Icon: Target,  k: 'Streak', v: '12 days', d: 'personal best', up: true },
];

/* one card sitting on the ring — parked at its angle, its content
   counter-rotating so it stays upright while the ring turns */
function OrbitChip({ i, item, count, spin }) {
  const a = (i / count) * 360;
  const radius = 288 + (i % 2 ? 16 : -12);   // slight in/out variation
  return (
    <div
      className="mr-orbit-slot"
      style={{ transform: `rotate(${a}deg) translate(0, -${radius}px)` }}
    >
      <motion.div
        className={`mr-orbit-card mr-orbit-card--${item.type}`}
        initial={{ rotate: -a }}
        animate={spin ? { rotate: -a - 360 } : { rotate: -a }}
        transition={spin ? { duration: 46, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
      {item.type === 'stat' && (
        <>
          <div className="mr-orbit-top">
            <span className="mr-orbit-k">{item.k}</span>
            <span className="mr-orbit-chip-i"><item.Icon size={14} weight="fill" /></span>
          </div>
          <span className="mr-orbit-v">{item.v}</span>
          <span className={`mr-orbit-d${item.up ? ' is-up' : ''}`}>{item.d}</span>
        </>
      )}
      {item.type === 'spark' && (
        <>
          <span className="mr-orbit-k">{item.k}</span>
          <span className="mr-orbit-v">{item.v}</span>
          <div className="mr-orbit-spark">
            {item.bars.map((h, k) => <i key={k} className={k >= 5 ? 'on' : ''} style={{ height: `${h}%` }} />)}
          </div>
        </>
      )}
      {item.type === 'chat' && (
        <>
          <span className="mr-orbit-k">Ask Clario</span>
          <span className="mr-orbit-msg mr-orbit-msg--me">{item.q}</span>
          <span className="mr-orbit-msg">{item.a}</span>
        </>
      )}
      {item.type === 'rows' && (
        <>
          <span className="mr-orbit-k">{item.k}</span>
          {item.rows.map(([label, amt]) => (
            <span className="mr-orbit-row" key={label}><span>{label}</span><b>{amt}</b></span>
          ))}
        </>
      )}
      {item.type === 'prog' && (
        <>
          <span className="mr-orbit-k">{item.k}</span>
          {item.items.map(([label, pct]) => (
            <span className="mr-orbit-prog" key={label}>
              <span>{label}</span>
              <span className="mr-orbit-track"><i className={pct >= 100 ? 'is-over' : ''} style={{ width: `${pct}%` }} /></span>
            </span>
          ))}
        </>
      )}
      </motion.div>
    </div>
  );
}

function Scatter() {
  const ref = useRef(null);
  const inView = useRef(false);
  const [spin, setSpin] = useState(false);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduced || !ref.current) return undefined;
    const io = new IntersectionObserver(([e]) => setSpin(e.isIntersecting), { rootMargin: '10%' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section className="mr-revolve" ref={ref}>
      <div className="mr-container">
        <motion.div
          className="mr-revolve-stage"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: SOFT }}
        >
          <span className="mr-orbit-ring" aria-hidden="true" />
          <span className="mr-orbit-ring mr-orbit-ring--in" aria-hidden="true" />

          <motion.div
            className="mr-orbit-spin"
            animate={spin ? { rotate: 360 } : { rotate: 0 }}
            transition={spin ? { duration: 46, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          >
            {ORBIT.map((o, k) => (
              <OrbitChip key={`${o.type}-${k}`} i={k} item={o} count={ORBIT.length} spin={spin} />
            ))}
          </motion.div>

          <div className="mr-revolve-content">
            <h2 className="mr-scatter-h">One screen. The whole month.</h2>
            <Link to="/login" className="mr-btn mr-btn--primary">
              Start free <ArrowRight size={14} weight="bold" />
            </Link>
            <a href="#platform" onClick={onNavClick('platform')} className="mr-scatter-link">Explore the platform</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── detailed bento — cards are light panels over a shadergradient plane ── */
function FeatCard({ progress, depth, tall, row, id, label, icon: Icon, title, body, i, bg, children }) {
  // copy holds, the mock art drifts hardest — parallax split
  const artY = useTransform(progress, [0, 1], [depth * 1.7, -depth * 1.7]);
  const copyY = useTransform(progress, [0, 1], [depth * -0.32, depth * 0.32]);
  const cls = [
    'mr-feat-card',
    bg && `mr-feat-card--${bg}`,
    tall && 'mr-feat-card--tall',
    row && 'mr-feat-card--row',
  ].filter(Boolean).join(' ');
  return (
    <motion.article className={cls} id={id} {...pop(i)}>
      <span className="mr-feat-orb" aria-hidden="true" />
      <motion.div
        className="mr-feat-copy" style={{ y: copyY }}
        variants={FEAT_COPY_PARENT} initial="hidden" whileInView="shown"
        viewport={{ once: true, amount: 0.5 }}
      >
        <motion.p className="mr-label mr-label--flame" variants={FEAT_COPY_CHILD}>
          {Icon ? <Icon size={15} weight="regular" /> : null}{label}
        </motion.p>
        <motion.h3 className="mr-t3" variants={FEAT_COPY_CHILD}>{title}</motion.h3>
        <motion.p variants={FEAT_COPY_CHILD}>{body}</motion.p>
      </motion.div>
      <motion.div
        className="mr-feat-art" style={{ y: artY }}
        initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, delay: 0.15, ease: SOFT }}
      >{children}</motion.div>
    </motion.article>
  );
}

function FeatSection() {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'cover');
  return (
    <section className="mr-section mr-feat-sec" id="platform" ref={ref}>
      <div className="mr-container">
        <div className="mr-head">
          <div className="mr-head-title">
            <Lines lines={['See the month, hold the', 'plan, ask the question.']} />
          </div>
        </div>

        <div className="mr-feat">
          <div className="mr-feat-col">
            <FeatCard progress={p} depth={52} bg="paper" i={0} icon={ChartPie}
              label="Overview" title="The month, in one screen"
              body="Balance across every account, what came in, what went out, and the shape of your cash flow.">
              <OverviewMock />
            </FeatCard>
            <FeatCard progress={p} depth={38} bg="grid" i={1} row icon={Lightning}
              label="Capture" title="Four ways in, no password"
              body="SMS, CSV, receipt or by hand — whichever is fastest that day.">
              <RowsMock />
            </FeatCard>
            <FeatCard progress={p} depth={66} bg="glow" tall i={2} icon={ChatCircleDots}
              label="Ask Clario" title="Ask your own data a question"
              body="Plain questions, answered from your transactions — not generic advice.">
              <AskMock />
            </FeatCard>
          </div>

          <div className="mr-feat-col">
            <FeatCard progress={p} depth={72} bg="fill" tall i={1} icon={Target}
              label="Budgets & goals" title="Warned before it is spent"
              body="Per-category limits with early warnings, and a table that shows exactly where a month drifted.">
              <DataTableMock />
            </FeatCard>
            <FeatCard progress={p} depth={44} bg="paper" i={2} icon={Wallet}
              label="Split" title="Needs, wants and what you kept"
              body="Every rupee sorted into three buckets so the shape of the month is a glance, not a spreadsheet.">
              <DropMock />
            </FeatCard>
            <FeatCard progress={p} depth={56} bg="glow" i={3} icon={Sparkle}
              label="Recaps" title="A month you will actually read"
              body="One figure in, one figure out, and the single category worth your attention next month.">
              <ChatBoxMock />
            </FeatCard>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── §6 · "See it move" — a pinned section; three steps scroll past
   horizontally as you scroll down, each visual doing a depth + reveal ──── */
const STEP_PANELS = [
  { n: '01', k: 'Connect nothing',
    p: 'No bank login, no OAuth screen. Import a statement or forward an SMS — the dashboard already has something to say.',
    Visual: () => (
      <div className="mr-step-vis">
        <div className="mr-step-window">
          <div className="mr-step-win-bar"><i /><i /><i /><span>Setup</span></div>
          <div className="mr-step-connect">
            <p className="mr-step-big">0</p>
            <p className="mr-step-cap">accounts connected · nothing to authorise</p>
            <div className="mr-step-rows">
              <span><Bank size={13} weight="fill" /> HDFC statement · Sept.csv <b>parsed</b></span>
              <span><DeviceMobile size={13} weight="fill" /> 12 bank SMS <b>filed</b></span>
            </div>
          </div>
        </div>
      </div>
    ) },
  { n: '02', k: 'The ten-second check',
    p: 'Once a week, one glance: what came in, what went out, and the single category that crept up. That is the whole ritual.',
    Visual: () => (
      <div className="mr-step-vis">
        <div className="mr-step-window">
          <div className="mr-step-win-bar"><i /><i /><i /><span>This week</span></div>
          <div className="mr-step-prog">
            {[['Groceries', 82, false], ['Shopping', 100, true], ['Transport', 58, false], ['Dining', 46, false]].map(([l, v, over]) => (
              <div className="mr-step-prog-i" key={l}>
                <b>{l}</b>
                <div className="mr-step-track"><i className={over ? 'is-over' : ''} style={{ width: `${v}%` }} /></div>
              </div>
            ))}
            <p className="mr-step-flag"><TrendUp size={12} weight="bold" /> Shopping is 61% over — worth a look</p>
          </div>
        </div>
      </div>
    ) },
  { n: '03', k: 'Read the recap',
    p: 'At month end, a page worth opening: what moved, what held, and the one thing to watch next month.',
    Visual: () => (
      <div className="mr-step-vis">
        <div className="mr-step-window mr-step-window--dark">
          <div className="mr-step-win-bar"><i /><i /><i /><span>September recap</span></div>
          <DataTableMock />
          <p className="mr-step-recap">Net <b>+₹1,13,460</b> · watch <b>Shopping</b> in October</p>
        </div>
      </div>
    ) },
];

function StepPanel({ progress, i, n, k, p: body, Visual, count }) {
  // this panel is "centred" around progress = (i + 0.5) / count
  const centre = (i + 0.5) / count;
  const near = useTransform(progress, [centre - 0.42 / count, centre, centre + 0.42 / count], [0, 1, 0]);
  const visScale = useTransform(near, [0, 1], [0.86, 1]);
  const visRot = useTransform(near, [0, 1], [7, 0]);
  const visOp = useTransform(near, [0, 1], [0.35, 1]);
  const numY = useTransform(near, [0, 1], [60, 0]);
  return (
    <div className="mr-step-panel">
      <motion.p className="mr-step-num" style={{ y: numY, opacity: visOp }} aria-hidden="true">{n}</motion.p>
      <div className="mr-step-copy">
        <p className="mr-label mr-label--flame">{n} · {k}</p>
        <p className="mr-step-body">{body}</p>
      </div>
      <motion.div
        className="mr-step-visual"
        style={{ scale: visScale, rotateY: visRot, opacity: visOp }}
      >
        <Visual />
      </motion.div>
    </div>
  );
}

/* ── §2 — scroll-gathered headline (Skiper 31, text variant) ─────────────
   Each character starts thrown out from the centre (x + rotateX scaled by its
   distance from the middle) and slides home as the section scrolls through.
   Text only — no 3D crawl. Body-scroller progress, not window `useScroll`. */
const GATHER_LINES = ['One month.', 'One honest picture.'];

function GatherChar({ ch, offset, progress }) {
  // convergence finishes by ~62% of the pin; the rest is the held, settled
  // headline before the section releases. Only transform + opacity here \u2014
  // both composite cheaply. Blur lives on the line (2 filters, not ~30).
  const x = useTransform(progress, [0.06, 0.6], [offset * 46, 0]);
  const rotateX = useTransform(progress, [0.06, 0.6], [offset * 42, 0]);
  const opacity = useTransform(progress, [0.04, 0.44], [0.12, 1]);
  return (
    <motion.span
      className={ch === ' ' ? 'mr-gather-ch mr-gather-sp' : 'mr-gather-ch'}
      style={{ x, rotateX, opacity }}
    >
      {ch === ' ' ? '\u00A0' : ch}
    </motion.span>
  );
}

function GatherLine({ text, progress }) {
  const chars = [...text];
  const centre = (chars.length - 1) / 2;
  const blurVal = useTransform(progress, [0.04, 0.44], [4, 0]);
  const filter = useMotionTemplate`blur(${blurVal}px)`;
  return (
    <motion.span className="mr-gather-line" style={{ filter }}>
      {chars.map((ch, i) => (
        <GatherChar key={i} ch={ch} offset={i - centre} progress={progress} />
      ))}
    </motion.span>
  );
}

function PerspectiveScroll() {
  const ref = useRef(null);
  // 'through' — progress 0 when the sticky headline pins, 1 just before it
  // releases. The whole convergence plays while the text is held centred,
  // and the finished headline holds for the last stretch before it leaves.
  const progress = useScrollProgress(ref, 'through');
  return (
    <section className="mr-section mr-gather" id="story" ref={ref}>
      <div className="mr-persp-cue" aria-hidden="true">
        <span>Scroll to bring it together</span>
      </div>
      <div className="mr-gather-stage">
        <h2 className="mr-gather-text">
          {GATHER_LINES.map((t) => (
            <GatherLine key={t} text={t} progress={progress} />
          ))}
        </h2>
      </div>
    </section>
  );
}

/* ── §6 — how it works · a plain vertical timeline ──────────────────────
   No scroll-drawn SVG (kept breaking). A static hairline connector runs
   through three numbered steps; each step fades up once, on viewport enter. */
const HOW_STEPS = [
  { n: '01', k: 'Capture it', p: 'Forward the bank SMS, drop a CSV, snap a receipt — or add it by hand in two taps.' },
  { n: '02', k: 'Clario sorts it', p: 'Merchant, category and amount are matched for you. Duplicates are dropped automatically.' },
  { n: '03', k: 'Read the month', p: 'One surface: where the money went, what changed, and the one thing worth watching next.' },
];

function HowStep({ n, k, p, i }) {
  return (
    <motion.li
      className="mr-how-step"
      initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1.4, delay: i * 0.12, ease: SOFT }}
    >
      <span className="mr-how-n" aria-hidden="true">{n}</span>
      <div className="mr-how-copy">
        <h3 className="mr-how-k">{k}</h3>
        <p className="mr-how-p">{p}</p>
      </div>
    </motion.li>
  );
}

function HowSection() {
  return (
    <section className="mr-section mr-how" id="how">
      <div className="mr-container">
        <Lines className="mr-t2" lines={['One line.', 'The whole month on it.']} />
        <motion.p className="mr-body mr-how-lede" {...rise(1)}>
          Everything you forward, snap or type lands on the same thread — sorted,
          de-duplicated, and ready to read in about ten seconds.
        </motion.p>
        <ol className="mr-how-list">
          {HOW_STEPS.map((s, i) => (
            <HowStep key={s.n} i={i} {...s} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── testimonials grid — per-line blur-up reveal, staggered down the grid
   (adapted from the reference's "Trusted by" grid; our copy + palette) ─── */
const TESTI_REVEAL = {
  hidden: { opacity: 0, y: -30, filter: 'blur(14px)' },
  shown: (i = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { delay: i * 0.14, duration: 1.25, ease: SOFT },
  }),
};

function TestiCard({ t, i }) {
  return (
    <motion.figure
      className={`mr-tg-card mr-tg-card--${t.tone}`}
      custom={i} variants={TESTI_REVEAL}
    >
      {t.tone === 'grid' && <span className="mr-tg-grid" aria-hidden="true" />}
      <blockquote className="mr-tg-quote">{t.q}</blockquote>
      <figcaption className="mr-tg-by">
        <img className="mr-tg-avatar" src={t.img} alt={t.by} loading="lazy" width="52" height="52" />
        <span>
          <b>{t.by}</b>
          <em>{t.role}</em>
        </span>
      </figcaption>
    </motion.figure>
  );
}

function TestiFeature() {
  const [i, setI] = useState(0);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduced) return undefined;
    const t = setInterval(() => setI(v => (v + 1) % TESTI.length), 4800);
    return () => clearInterval(t);
  }, [reduced]);
  const T = TESTI[i];
  return (
    <motion.div className="mr-tg-feature" {...rise()}>
      <span className="mr-tg-feature-mark" aria-hidden="true"><Quotes size={24} weight="fill" /></span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i} className="mr-tg-feature-inner"
          initial={{ opacity: 0, y: 12, filter: 'blur(7px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(7px)' }}
          transition={{ duration: 0.55, ease: SOFT }}
        >
          <blockquote className="mr-tg-feature-q">{T.q}</blockquote>
          <figcaption className="mr-tg-feature-by">
            <img src={T.img} alt={T.by} width="48" height="48" />
            <span><b>{T.by}</b><em>{T.role}</em></span>
          </figcaption>
        </motion.div>
      </AnimatePresence>
      <div className="mr-tg-feature-dots" role="tablist" aria-label="Choose a testimonial">
        {TESTI.map((t, k) => (
          <button key={t.by} type="button" aria-label={`Testimonial ${k + 1}`}
            aria-current={k === i} onClick={() => setI(k)} />
        ))}
      </div>
    </motion.div>
  );
}

function Testimonials() {
  const cols = [[0, 1], [2, 3, 4], [5, 6]];
  return (
    <section className="mr-tg" id="proof">
      <div className="mr-container">
        <div className="mr-tg-head">
          <Lines className="mr-t0" lines={['The people who’d', 'given up on trackers.']} />
          <motion.p {...rise(1)}>
            They’d tried the spreadsheets, the apps with the bank logins, the
            envelopes. This is the one that stuck — because there’s almost
            nothing to keep up.
          </motion.p>
        </div>

        <TestiFeature />

        <motion.div
          className="mr-tg-grid-wrap"
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.15 }}
        >
          {cols.map((col, c) => (
            <div className="mr-tg-col" key={c}>
              {col.map(idx => <TestiCard key={idx} t={TESTI[idx]} i={idx} />)}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const Deco = () => (
  <div className="mr-deco">
    <div className="mr-container"><div className="mr-deco-inner"><i /><i /><i /></div></div>
  </div>
);

/* ── FAQ — borderless accordion, one open at a time ──────────────────── */
const FAQS = [
  { q: 'Do I have to connect my bank?',
    a: 'No — and there’s no option to. Forward the SMS your bank already sends, drop in a statement, snap a receipt, or type a spend in two taps. Everything works without a bank login.' },
  { q: 'Which statements does the CSV import read?',
    a: 'HDFC, ICICI, SBI, Axis and Kotak out of the box, and most other Indian banks besides. The columns map themselves and duplicate rows are caught before they land.' },
  { q: 'Is my data sold, shared, or used to train anything?',
    a: 'No. It’s yours. Export the whole thing whenever you like, and deleting your account wipes it in one action — nothing is retained.' },
  { q: 'What does it cost?',
    a: 'Free to start, with no card required. Paid plans add history depth and the shared household view; you’ll always be told before anything changes.' },
  { q: 'Can my partner and I share one view?',
    a: 'Yes. A household view merges both of your imports into one dashboard, with per-person and combined figures.' },
  { q: 'How long does setup take?',
    a: 'About forty seconds. Import one statement and the dashboard already has something to tell you — balance, cash flow, and the category that moved most.' },
];

function FaqRow({ q, a, open, onToggle }) {
  return (
    <div className={`mr-faq-row${open ? ' is-open' : ''}`}>
      <button type="button" className="mr-faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{q}</span>
        <span className="mr-faq-sign" aria-hidden="true" />
      </button>
      <motion.div
        className="mr-faq-a"
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.45, ease: SOFT }}
      >
        <p>{a}</p>
      </motion.div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mr-section mr-faq" id="faq">
      <div className="mr-container">
        <div className="mr-head">
          <div className="mr-head-title">
            <Lines className="mr-t2" lines={['The questions', 'that come up first.']} />
          </div>
          <motion.div className="mr-head-aside" {...rise(1)}>
            <p className="mr-body">
              Still unsure? <Link to="/login">Start free</Link> — nothing is charged
              and nothing is connected.
            </p>
          </motion.div>
        </div>
        <motion.div className="mr-faq-list" {...rise()}>
          {FAQS.map((f, i) => (
            <FaqRow key={f.q} q={f.q} a={f.a} open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'cover');
  const grainY = useTransform(p, [0.2, 0.9], ['-34%', '30%']);
  const bloomY = useTransform(p, [0.2, 0.9], ['34%', '-24%']);
  const leadY = useTransform(p, [0.2, 0.9], [110, -24]);
  const gridY = useTransform(p, [0.2, 0.9], [64, -12]);
  return (
    <footer className="mr-foot" ref={ref}>
      <motion.span className="mr-foot-grain" style={{ y: grainY }} aria-hidden="true" />
      <motion.span className="mr-foot-bloom" style={{ y: bloomY }} aria-hidden="true" />
      <div className="mr-container">
        <motion.div className="mr-foot-lead" style={{ y: leadY }} {...rise()}>
          <h2 className="mr-foot-h">
            The month is already happening.<br />See where it’s going.
          </h2>
          <Link to="/login" className="mr-btn mr-btn--primary mr-foot-cta">
            Start free <ArrowRight size={14} weight="bold" />
          </Link>
        </motion.div>

        <motion.div className="mr-foot-grid" style={{ y: gridY }}>
          <div className="mr-foot-brand">
            <Link to="/" className="mr-nav-brand" aria-label="Clario — reload" onClick={(e) => { e.preventDefault(); window.location.assign('/'); }}>
              <LogoMark size={26} /><LogoWordmark height={17} />
            </Link>
            <p>The picture, without surrendering the keys.</p>
          </div>
          <div className="mr-foot-col">
            <h4>Product</h4>
            {NAV.map(n => <a key={n.id} href={`#${n.id}`} onClick={onNavClick(n.id)}>{n.label}</a>)}
          </div>
          <div className="mr-foot-col">
            <h4>Get data in</h4>
            {SLIDES.map(s => <a key={s.k} href="#capture" onClick={onNavClick('capture')}>{s.k}</a>)}
          </div>
          <div className="mr-foot-col">
            <h4>Account</h4>
            <Link to="/login">Log in</Link>
            <Link to="/login">Create an account</Link>
            <a href="#proof" onClick={onNavClick('proof')}>Proof</a>
          </div>
        </motion.div>

        <div className="mr-foot-bottom">
          <span>© {new Date().getFullYear()} Clario</span>
          <span><ShieldCheck size={13} weight="fill" /> Your data stays yours — export or delete any time.</span>
        </div>
      </div>
    </footer>
  );
}

export default function PrelandingPage() {
  const { isLoggedIn } = useAuth();
  const [navTight, setNavTight] = useState(false);
  useEffect(() => {
    // Always open at the top. The browser's scroll restoration would otherwise
    // drop a reload back mid-page, where the scroll-driven transforms and pins
    // start from an inconsistent state — that's the "glitch on refresh".
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    return () => { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; };
  }, []);
  useEffect(() => {
    // the prelanding page is light-only. ThemeContext re-asserts its own
    // data-theme from state, so a plain setAttribute loses the race after a
    // dark-dashboard session — watch the attribute and keep it on light.
    const el = document.documentElement;
    const pin = () => { if (el.getAttribute('data-theme') !== 'light') el.setAttribute('data-theme', 'light'); };
    pin();
    const mo = new MutationObserver(pin);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mo.disconnect();
      // hand the theme back to the user's real preference for the authed app
      const saved = localStorage.getItem('finance_theme');
      const want = (saved === 'dark' || saved === 'light')
        ? saved
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      el.setAttribute('data-theme', want);
    };
  }, []);
  useEffect(() => {
    // body is the scroll container on this page, not documentElement
    const read = () => document.body.scrollTop || document.documentElement.scrollTop || window.scrollY || 0;
    const onScroll = () => setNavTight(read() > 40);
    onScroll();
    const targets = [window, document, document.body];
    targets.forEach(t => t.addEventListener('scroll', onScroll, { passive: true }));
    return () => targets.forEach(t => t.removeEventListener('scroll', onScroll));
  }, []);
  useEffect(() => {
    // Lenis — normal wheel speed, but the scroll position is eased every frame
    // so every scroll-driven transform on the page moves smoothly instead of
    // jumping between wheel notches. Disabled for reduced-motion.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({
      // matched to trymeridian.com — Lenis' canonical easeOutExpo glide
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,        // normal mouse speed
      touchMultiplier: 1.5,
      syncTouch: false,
    });
    lenisRef = lenis;
    let raf = 0;
    const loop = (time) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef = null; };
  }, []);
  const heroRef = useRef(null);
  const heroProgress = useScrollProgress(heroRef, 'exit');
  const heroLift = useTransform(heroProgress, [0, 1], ['0%', '-18%']);
  const heroFade = useTransform(heroProgress, [0, 0.75], [1, 0]);
  const stageLift = useTransform(heroProgress, [0, 1], ['0%', '-6%']);

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mr">
      <motion.header 
        className={`mr-nav${navTight ? ' is-tight' : ''}`}
        initial={{ opacity: 0, x: '-50%', y: '-100%' }}
        animate={{ opacity: 1, x: '-50%', y: '0%' }}
        transition={{ duration: 1.1, delay: 0.1, ease: SOFT }}
      >
        <div className="mr-nav-pill">
          <Link to="/" className="mr-nav-brand" aria-label="Clario — reload" onClick={(e) => { e.preventDefault(); window.location.assign('/'); }}>
            <LogoMark size={30} /><LogoWordmark height={21} />
          </Link>
          <nav className="mr-nav-links">
            {NAV.map(n => <a key={n.id} href={`#${n.id}`} onClick={onNavClick(n.id)}>{n.label}</a>)}
          </nav>
          <div className="mr-nav-cta">
            <Link to="/login" className="mr-btn mr-btn--dark">Log in</Link>
            <Link to="/login" className="mr-btn mr-btn--primary">
              Start free <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ══ 1 · HERO ═════════════════════════════════════════════════════ */}
      <section className="mr-hero" ref={heroRef}>
        <span className="mr-hero-light" aria-hidden="true" />
        <span className="mr-hero-noise" aria-hidden="true" />
        <div className="mr-container">
          <div className="mr-hero-layout">
            <motion.div className="mr-hero-col" style={{ y: heroLift, opacity: heroFade }}>
              <div className="mr-hero-copy">
                <motion.p className="mr-hero-eyebrow"
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.4, delay: 0.05, ease: SOFT }}>
                  <span className="mr-hero-dot" aria-hidden="true" />
                  No bank login. Not now, not ever.
                </motion.p>
                <CyclingHeadline />
                <Reveal
                  as={motion.p}
                  className="mr-hero-sub mr-text"
                  delay={0.5}
                  parts={[
                    { t: 'Forward' }, { t: 'one' }, { t: 'bank' }, { t: 'SMS.' },
                    { t: 'Forty' }, { t: 'seconds' }, { t: 'on' }, { t: 'a' }, { t: 'Sunday,' },
                    { t: 'and' }, { t: 'the' }, { t: 'whole' }, { t: 'month' }, { t: 'is' }, { t: 'there.' },
                  ]}
                />

                <motion.div className="mr-hero-cta"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.1, delay: 0.74, ease: SOFT }}>
                  <Link to="/login" className="mr-btn mr-btn--light">
                    Start free <ArrowRight size={14} weight="bold" />
                  </Link>
                  <a href="#platform" onClick={onNavClick('platform')} className="mr-btn mr-btn--outline">See how it works</a>
                </motion.div>
                <motion.ul className="mr-hero-tags"
                  initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 1, delay: 0.95, ease: SOFT }}>
                  <li>₹0 to start</li>
                  <li>4-tap import</li>
                  <li>Your data stays yours</li>
                </motion.ul>
              </div>
            </motion.div>

            <motion.div className="mr-hero-sphere" style={{ y: stageLift }}>
              <GlobePolaroids className="!absolute inset-0" />
            </motion.div>
          </div>
        </div>
        <span className="mr-hero-seam" aria-hidden="true" />
      </section>

      {/* ══ 2 · STATEMENT ═══════════════════════════════════════════════ */}
      <PerspectiveScroll />

      {/* ══ 2b · CROWD ══════════════════════════════════════════════════ */}
      <section className="mr-crowd" aria-label="Who Clario is for">
        <motion.div
          className="mr-crowd-copy"
          variants={FEAT_COPY_PARENT} initial="hidden" whileInView="shown"
          viewport={{ once: true, amount: 0.5 }}
        >
          <motion.span className="mr-crowd-eyebrow" variants={FEAT_COPY_CHILD}>No bank login · No spreadsheet · No lecture</motion.span>
          <motion.h2 className="mr-crowd-h" variants={FEAT_COPY_CHILD}>
            A money app for the people who never wanted one.
          </motion.h2>
        </motion.div>
        <CrowdCanvas
          src="/images/peeps/all-peeps.png"
          rows={15}
          cols={7}
          className="mr-crowd-canvas"
        />
      </section>

      {/* ══ 2 · MARQUEE ══════════════════════════════════════════════════ */}
      <div className="mr-marquee" aria-label="What Clario reads">
        <div className="mr-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span className="mr-marquee-item" key={`${m.k}-${i}`}>
              <m.Icon size={20} weight="fill" /> {m.k}
            </span>
          ))}
        </div>
      </div>

      {/* ══ 3 · CAPTURE ══════════════════════════════════════════════════ */}
      <CaptureSection />

      {/* ══ 4 · SCATTER ══════════════════════════════════════════════════ */}
      <Scatter />

      {/* ══ 5 · BENTO ════════════════════════════════════════════════════ */}
      <FeatSection />

      <Deco />

      {/* ══ 6 · HOW IT WORKS · scroll-drawn connecting line ══════════════ */}
      <HowSection />

      <Deco />

      {/* ══ 7 · TESTIMONIALS ═════════════════════════════════════════════ */}
      <Testimonials />

      <Deco />

      {/* ══ 7b · FAQ ═════════════════════════════════════════════════════ */}
      <Faq />

      {/* ══ 8 · CTA ══════════════════════════════════════════════════════ */}
      <section className="mr-section">
        <div className="mr-container">
          <motion.div className="mr-cta" {...rise()}>
            <Lines className="mr-t0" lines={['Start with one number.']} />
            <p className="mr-text">
              Add a single transaction and the dashboard already has something to tell you.
            </p>
            <div className="mr-cta-btns">
              <Link to="/login" className="mr-btn mr-btn--light">
                Create a free account <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
            <p className="mr-cta-fine">
              <ShieldCheck size={13} weight="fill" /> No card. No bank login. No sold data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ 9 · FOOTER ═══════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}






