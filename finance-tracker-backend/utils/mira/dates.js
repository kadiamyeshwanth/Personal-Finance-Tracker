/**
 * mira/dates.js — turn an English time expression into a concrete range.
 *
 * Every question worth answering carries a period: "last month", "in August",
 * "this week", "over the last 90 days". The old engine had no notion of time at
 * all, which is why nothing more specific than "this month" could be answered.
 *
 * Pure and deterministic: `now` is always injected so the whole thing is
 * testable and never depends on the clock at call time.
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const monthRange = (year, month) => ({
  from: new Date(year, month, 1, 0, 0, 0, 0),
  to:   new Date(year, month + 1, 0, 23, 59, 59, 999),
});

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Parse the first time expression found in `text`.
 *
 * @param {string} text
 * @param {Date}   now  - reference "today"
 * @returns {{from: Date, to: Date, label: string, matched: string}|null}
 */
const parseDateRange = (text, now = new Date()) => {
  if (!text) return null;
  const s = String(text).toLowerCase();

  // ── relative days ────────────────────────────────────────────────────────
  if (/\btoday\b/.test(s)) {
    return { from: startOfDay(now), to: endOfDay(now), label: 'today', matched: 'today' };
  }
  if (/\byesterday\b/.test(s)) {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: 'yesterday', matched: 'yesterday' };
  }

  // ── "last 7 days" / "past 3 months" / "last 2 weeks" ─────────────────────
  const rolling = s.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+(day|days|week|weeks|month|months|year|years)\b/);
  if (rolling) {
    const n = parseInt(rolling[1], 10);
    const unit = rolling[2].replace(/s$/, '');
    const from = new Date(now);
    if (unit === 'day')   from.setDate(from.getDate() - n);
    if (unit === 'week')  from.setDate(from.getDate() - n * 7);
    if (unit === 'month') from.setMonth(from.getMonth() - n);
    if (unit === 'year')  from.setFullYear(from.getFullYear() - n);
    return {
      from: startOfDay(from), to: endOfDay(now),
      label: `the last ${n} ${unit}${n > 1 ? 's' : ''}`, matched: rolling[0],
    };
  }

  // ── this / last month, week, year ────────────────────────────────────────
  if (/\b(this|current)\s+month\b/.test(s)) {
    const r = monthRange(now.getFullYear(), now.getMonth());
    return { ...r, label: 'this month', matched: 'this month' };
  }
  if (/\blast\s+month\b/.test(s) || /\bprevious\s+month\b/.test(s)) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const r = monthRange(d.getFullYear(), d.getMonth());
    return { ...r, label: 'last month', matched: 'last month' };
  }
  if (/\b(this|current)\s+week\b/.test(s)) {
    const from = new Date(now); from.setDate(from.getDate() - from.getDay());
    return { from: startOfDay(from), to: endOfDay(now), label: 'this week', matched: 'this week' };
  }
  if (/\blast\s+week\b/.test(s)) {
    const end = new Date(now); end.setDate(end.getDate() - end.getDay() - 1);
    const from = new Date(end); from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(end), label: 'last week', matched: 'last week' };
  }
  if (/\b(this|current)\s+year\b/.test(s)) {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      label: 'this year', matched: 'this year',
    };
  }
  if (/\blast\s+year\b/.test(s)) {
    const y = now.getFullYear() - 1;
    return {
      from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999),
      label: 'last year', matched: 'last year',
    };
  }

  // ── a named month, optionally with a year: "in August", "aug 2025" ───────
  // Word-boundary anchored so "may" only matches the month when it reads like
  // one — "may I", "you may" would otherwise hijack the whole question.
  const monthRe = new RegExp(`\\b(${MONTHS.join('|')}|${MONTH_ABBR.join('|')})\\b\\.?\\s*(\\d{4})?`, 'i');
  const m = s.match(monthRe);
  if (m) {
    const raw = m[1].toLowerCase();
    // "may" is also a modal verb — require a date-ish context before trusting it
    if (raw === 'may' && !/\b(in|during|for|of)\s+may\b/.test(s) && !m[2]) return null;
    let idx = MONTHS.indexOf(raw);
    if (idx === -1) idx = MONTH_ABBR.indexOf(raw);
    if (idx === -1) return null;

    let year = m[2] ? parseInt(m[2], 10) : now.getFullYear();
    // No year given and the month is still ahead of us → they mean last year.
    if (!m[2] && idx > now.getMonth()) year -= 1;

    const r = monthRange(year, idx);
    return { ...r, label: `${MONTH_NAMES[idx]} ${year}`, matched: m[0].trim() };
  }

  // ── a bare year: "in 2025", "what did I spend in 2024" ───────────────────
  // Last, so a month-plus-year expression is always preferred over the year alone.
  const bareYear = s.match(/\b(20\d{2})\b/);
  if (bareYear) {
    const y = parseInt(bareYear[1], 10);
    return {
      from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999),
      label: String(y), matched: bareYear[1],
    };
  }

  return null;
};

/** Human label for an arbitrary range, used when echoing a query back. */
const describeRange = (range) => (range ? range.label : 'all time');

/** The calendar month before the one containing `range.from`. */
const previousPeriod = (range) => {
  if (!range) return null;
  const spanMs = range.to - range.from;
  const from = new Date(range.from.getTime() - spanMs - 1);
  const to   = new Date(range.from.getTime() - 1);
  // For whole-month ranges, snap to the previous calendar month so labels stay clean.
  const isWholeMonth = range.from.getDate() === 1 &&
    range.to.getDate() === new Date(range.to.getFullYear(), range.to.getMonth() + 1, 0).getDate();
  if (isWholeMonth) {
    const d = new Date(range.from.getFullYear(), range.from.getMonth() - 1, 1);
    const r = monthRange(d.getFullYear(), d.getMonth());
    return { ...r, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  }
  return { from, to, label: 'the preceding period' };
};

/**
 * Pull BOTH sides out of "compare August to September" / "August vs September".
 *
 * Without this, a two-sided comparison silently used only the first date it
 * found and compared it against its own preceding period — so asking for
 * August vs September answered August vs July.
 *
 * @returns {{a: range, b: range}|null} - null unless both sides parse
 */
const parseComparisonRanges = (text, now = new Date()) => {
  const s = String(text || '').toLowerCase();
  const split = s.split(/\s+(?:vs\.?|versus|against|to|and|with)\s+/);
  if (split.length < 2) return null;

  for (let i = 0; i < split.length - 1; i++) {
    const a = parseDateRange(split[i], now);
    const b = parseDateRange(split[i + 1], now);
    if (a && b && a.label !== b.label) {
      // Report them oldest-first so "up/down" reads in the natural direction.
      return a.from <= b.from ? { a, b } : { a: b, b: a };
    }
  }
  return null;
};

module.exports = { parseDateRange, parseComparisonRanges, describeRange, previousPeriod, MONTH_NAMES, monthRange };
