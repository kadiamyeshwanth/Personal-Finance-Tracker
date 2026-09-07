/**
 * mira/entities.js — pull the concrete nouns out of a question.
 *
 * The old engine matched 14 whole-sentence regexes and extracted nothing, so
 * "how much did I spend on food last month" and "how much did I spend" were
 * indistinguishable. Everything specific a user asks lives in these slots:
 *
 *   category   Food, Travel, …          (matched against the user's real categories)
 *   merchant   Swiggy, Amazon, …        (matched against merchants they actually have)
 *   range      a resolved date window   (see dates.js)
 *   amount     40000, ₹40,000, 40k, 1.5 lakh
 *   comparator over / under a threshold
 *   limit      "top 3"
 */

const { parseDateRange } = require('./dates');

/** Words that must never be read as a merchant, however the sentence is shaped. */
const STOPWORDS = new Set([
  'the','a','an','my','me','i','is','are','was','were','do','did','does','on','in','at','for','of','to',
  'how','much','many','what','when','where','why','which','who','can','could','should','would','will',
  'spend','spent','spending','cost','costs','pay','paid','buy','bought','save','saved','saving','savings',
  'this','that','last','next','past','previous','month','week','year','day','days','weeks','months','years',
  'total','all','any','some','more','less','than','over','under','above','below','about','around',
  'money','rupees','rs','inr','budget','budgets','category','categories','transaction','transactions',
  'and','or','but','with','from','by','it','its','am','be','been','have','has','had','get','got','show',
  'tell','give','list','find','need','want','know','see','look','go','going','afford','account','please',
]);

/** ₹40,000 · 40000 · 40k · 1.5 lakh · 2 cr — returns a number or null. */
const parseAmount = (text) => {
  if (!text) return null;
  const s = String(text).toLowerCase();

  // 1.5 lakh / 2 crore / 40 k
  const scaled = s.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac|lakhs|cr|crore|crores)\b/);
  if (scaled) {
    const n = parseFloat(scaled[1]);
    const unit = scaled[2];
    if (/^k|thousand$/.test(unit)) return n * 1e3;
    if (/^l/.test(unit))           return n * 1e5;
    return n * 1e7;                                    // crore
  }

  // ₹40,000 / 40000 — ignore 4-digit years so "in 2025" isn't read as an amount
  const plain = s.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/)
             || s.match(/\b([\d,]{3,}(?:\.\d{1,2})?)\b/);
  if (plain) {
    const n = parseFloat(plain[1].replace(/,/g, ''));
    if (!isNaN(n) && !(n >= 1900 && n <= 2100 && /\b(19|20)\d{2}\b/.test(plain[1]))) return n;
  }
  return null;
};

/** over/above/more than · under/below/less than */
const parseComparator = (text) => {
  const s = String(text || '').toLowerCase();
  if (/\b(over|above|more than|greater than|bigger than|exceeding|>)\b/.test(s)) return 'gt';
  if (/\b(under|below|less than|smaller than|cheaper than|<)\b/.test(s))        return 'lt';
  return null;
};

/** "top 3", "biggest 5" — how many rows they want back. */
const parseLimit = (text) => {
  const m = String(text || '').toLowerCase().match(/\b(?:top|first|biggest|largest|highest)\s+(\d{1,2})\b/);
  return m ? Math.min(parseInt(m[1], 10), 20) : null;
};

/**
 * Match a known value (category or merchant) inside the message.
 * Longest match wins, so "Cafe Coffee Day" beats "Coffee", and matching is
 * word-boundary anchored so "tea" can't match inside "steam".
 */
const matchKnown = (text, known = []) => {
  const s = ` ${String(text || '').toLowerCase()} `;
  const hits = [];
  for (const value of known) {
    if (!value) continue;
    const v = String(value).toLowerCase().trim();
    if (v.length < 2) continue;
    const re = new RegExp(`(?:^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`);
    if (re.test(s)) hits.push(value);
  }
  hits.sort((a, b) => String(b).length - String(a).length);
  return hits[0] || null;
};

/**
 * Extract every entity Mira knows how to use.
 *
 * @param {string} message
 * @param {object} ctx  - { categories: string[], merchants: string[], now: Date }
 */
const extract = (message, ctx = {}) => {
  const text = String(message || '');
  const { categories = [], merchants = [], now = new Date() } = ctx;

  const range = parseDateRange(text, now);
  // Don't let the date expression bleed into merchant matching
  const withoutDate = range?.matched ? text.toLowerCase().replace(range.matched.toLowerCase(), ' ') : text.toLowerCase();

  const category = matchKnown(withoutDate, categories);
  // A merchant that is also the matched category name adds nothing
  let merchant = matchKnown(withoutDate, merchants.filter(m => m && m.toLowerCase() !== String(category || '').toLowerCase()));
  if (merchant && STOPWORDS.has(String(merchant).toLowerCase())) merchant = null;

  return {
    range,
    category,
    merchant,
    amount:     parseAmount(withoutDate),
    comparator: parseComparator(text),
    limit:      parseLimit(text),
  };
};

module.exports = { extract, parseAmount, parseComparator, parseLimit, matchKnown, STOPWORDS };
