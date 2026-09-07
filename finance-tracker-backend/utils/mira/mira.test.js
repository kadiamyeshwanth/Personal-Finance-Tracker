/**
 * mira.test.js — regression suite for the assistant.
 *
 * Run: node utils/mira/mira.test.js
 *
 * No test framework on purpose: the backend has no test runner configured, and
 * this needs to be runnable by anyone with `node` and no install step. Exits
 * non-zero on failure so it can be wired into CI as-is.
 *
 * The cases marked REGRESSION encode bugs that actually shipped — keep them.
 */

const assert = require('assert');
const { ask } = require('./index');
const { detect } = require('./intents');
const { extract } = require('./entities');
const { parseDateRange, parseComparisonRanges } = require('./dates');
const Q = require('./query');

const NOW = new Date('2026-09-15T14:00:00');
const mk = (type, category, amount, date, merchant = '') =>
  ({ type, category, amount, date: new Date(date), merchant, isRecurring: false, flags: [] });

const TXNS = [
  mk('income',  'Salary', 85000, '2026-08-01'),
  mk('income',  'Salary', 85000, '2026-09-01'),
  mk('expense', 'Food',    2400, '2026-08-03', 'Swiggy'),
  mk('expense', 'Food',    1850, '2026-08-07', 'BigBasket'),
  mk('expense', 'Food',     900, '2026-08-14', 'Swiggy'),
  mk('expense', 'Travel',  3200, '2026-08-09', 'IndiGo'),
  mk('expense', 'Food',    3100, '2026-09-04', 'Swiggy'),
  mk('expense', 'Shopping',12500,'2026-09-12', 'Amazon'),
  mk('expense', 'Bills',   2100, '2026-09-05', 'BESCOM'),
  mk('expense', 'Food',     780, '2026-09-13', 'Swiggy'),
];
const CTX = {
  transactions: TXNS,
  budgets: [{ category: 'Food', limit: 5000 }],
  goals: [{ name: 'Bike', currentAmount: 12000, targetAmount: 50000 }],
  subscriptions: [],
  now: NOW,
};

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  catch (err) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${err.message}`); }
};
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

// ─── Intent detection ────────────────────────────────────────────────────────
section('Intent detection');

test('REGRESSION: "highest expense" is not a greeting', () => {
  // The old pattern /hello|hi|hey/ matched the "hi" inside "highest".
  assert.notStrictEqual(detect('What is my highest expense?', {}).intent, 'greeting');
  assert.strictEqual(detect('What is my highest expense?', {}).intent, 'biggest');
});

test('REGRESSION: words containing "hi" do not trigger a greeting', () => {
  for (const q of ['Show me everything over 3000', 'Is this within budget?',
                   'Which category is worst?', 'Anything hidden?']) {
    assert.notStrictEqual(detect(q, {}).intent, 'greeting', `"${q}" matched greeting`);
  }
});

test('a real greeting is still a greeting', () => {
  for (const q of ['hi', 'hello', 'Hey!', 'namaste']) {
    assert.strictEqual(detect(q, {}).intent, 'greeting', `"${q}" did not match greeting`);
  }
});

test('affordability requires an amount', () => {
  assert.strictEqual(detect('can I afford it', {}).intent !== 'affordability', true);
  assert.strictEqual(detect('can I afford a 40000 laptop', { amount: 40000 }).intent, 'affordability');
});

test('plural cues match ("weekends")', () => {
  assert.strictEqual(detect('Did I spend more on weekends?', {}).intent, 'day_pattern');
});

// ─── Date parsing ────────────────────────────────────────────────────────────
section('Date parsing');

test('relative ranges resolve correctly', () => {
  assert.strictEqual(parseDateRange('last month', NOW).label, 'last month');
  assert.strictEqual(parseDateRange('this month', NOW).from.getMonth(), 8);   // September
  assert.strictEqual(parseDateRange('last month', NOW).from.getMonth(), 7);   // August
});

test('named months, with and without a year', () => {
  assert.strictEqual(parseDateRange('in August', NOW).label, 'August 2026');
  assert.strictEqual(parseDateRange('august 2025', NOW).label, 'August 2025');
});

test('a future month without a year means last year', () => {
  // Asked in September, "in December" can only mean the December just gone.
  assert.strictEqual(parseDateRange('in December', NOW).label, 'December 2025');
});

test('"may" as a modal verb is not the month of May', () => {
  assert.strictEqual(parseDateRange('may I ask something', NOW), null);
  assert.strictEqual(parseDateRange('spending in may', NOW).label, 'May 2026');
});

test('month boundaries are inclusive and local', () => {
  const r = parseDateRange('in August', NOW);
  assert.strictEqual(r.from.getDate(), 1);
  assert.strictEqual(r.from.getHours(), 0);
  assert.strictEqual(r.to.getDate(), 31);
  assert.strictEqual(r.to.getHours(), 23);
});

test('REGRESSION: a two-sided comparison reads both sides', () => {
  // "August to September" used to compare August against July.
  const pair = parseComparisonRanges('Compare August to September', NOW);
  assert.ok(pair, 'no pair parsed');
  assert.strictEqual(pair.a.label, 'August 2026');
  assert.strictEqual(pair.b.label, 'September 2026');
});

// ─── Entity extraction ───────────────────────────────────────────────────────
section('Entity extraction');

const ECTX = { categories: ['Food', 'Travel', 'Shopping'], merchants: ['Swiggy', 'Amazon'], now: NOW };

test('category, merchant and period come out together', () => {
  const e = extract('How much did I spend on Food last month?', ECTX);
  assert.strictEqual(e.category, 'Food');
  assert.strictEqual(e.range.label, 'last month');
});

test('Indian amount formats parse', () => {
  assert.strictEqual(extract('can I afford 40k', ECTX).amount, 40000);
  assert.strictEqual(extract('spent 1.5 lakh', ECTX).amount, 150000);
  assert.strictEqual(extract('a ₹40,000 laptop', ECTX).amount, 40000);
});

test('a year is not mistaken for an amount', () => {
  assert.strictEqual(extract('what did I spend in 2025', ECTX).amount, null);
});

test('comparators are picked up', () => {
  assert.strictEqual(extract('everything over 3000', ECTX).comparator, 'gt');
  assert.strictEqual(extract('anything under 500', ECTX).comparator, 'lt');
});

// ─── Query engine ────────────────────────────────────────────────────────────
section('Query engine');

test('filtering by category and range totals correctly', () => {
  const aug = parseDateRange('in August', NOW);
  const rows = Q.filter(TXNS, { category: 'Food', range: aug, type: 'expense' });
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(Q.sum(rows), 2400 + 1850 + 900);
});

test('recurring templates are excluded from spend', () => {
  const withTemplate = [...TXNS, { ...mk('expense', 'Food', 99999, '2026-09-10'), isRecurring: true }];
  assert.strictEqual(Q.sum(Q.filter(withTemplate, { type: 'expense', category: 'Food' })),
                     Q.sum(Q.filter(TXNS, { type: 'expense', category: 'Food' })));
});

test('affordability reflects real surplus', () => {
  const a = Q.affordability(TXNS, 40000, NOW);
  assert.strictEqual(a.basedOnMonths, 2);
  assert.ok(a.monthlySurplus > 0, 'expected a positive surplus');
});

test('goal projection returns months and an ETA', () => {
  const p = Q.goalProjection(TXNS, { name: 'Bike', currentAmount: 12000, targetAmount: 50000 });
  assert.strictEqual(p.feasible, true);
  assert.strictEqual(p.remaining, 38000);
  assert.ok(p.monthsNeeded > 0);
});

// ─── Chat shorthand, identity, and orphaned intents ─────────────────────────
// Found live: casual texting shorthand and several intents Mira could
// correctly DETECT but had no handler for, silently falling through to the
// legacy engine's own, narrower re-detection and losing the answer entirely.
section('Chat shorthand, identity, and previously-orphaned intents');

test("REGRESSION: 'whats ur name' gets an actual introduction, not the generic fallback", () => {
  const r = ask('whats ur name', CTX);
  assert.strictEqual(r.intent, 'identity');
  assert.ok(/mira/i.test(r.text), `expected Mira's name in: ${r.text}`);
  assert.ok(!r.text.startsWith('🤔'), 'fell through to the generic fallback');
});

test("REGRESSION: 'can u tell me how to spend my money less' is recognised as a savings question", () => {
  const r = ask('can u tell me how to spend my money less', CTX);
  assert.strictEqual(r.intent, 'save_more');
  assert.ok(!r.text.startsWith('🤔'), 'fell through to the generic fallback');
});

test('a detected intent with no Mira handler still gets answered, not dropped', () => {
  // These 8 intents score correctly in intents.js but have no entry in
  // index.js's `handlers` map — without forwarding the detected intent into
  // the legacy engine, each of these used to silently discard Mira's own
  // correct detection and fall back to legacy's independent (and narrower)
  // re-detection, which frequently missed and landed on the generic menu.
  const cases = [
    ['whats my budget status', 'budget_status'],
    ['tell me about my goals', 'goals_status'],
    ['give me investment advice', 'investment_advice'],
    ['how do i deal with debt', 'debt_advice'],
    ['should i build an emergency fund', 'emergency_fund'],
    ['whats my spending personality', 'personality'],
    ['any tips for me', 'general_tips'],
  ];
  for (const [q, expectedIntent] of cases) {
    const r = ask(q, CTX);
    assert.strictEqual(r.intent, expectedIntent, `"${q}" -> expected intent ${expectedIntent}, got ${r.intent}`);
    assert.ok(!r.text.startsWith('🤔'), `"${q}" fell through to the generic fallback`);
  }
});

test("REGRESSION: 'how can I save more money' gives savings tips, not a specific goal's ETA", () => {
  // goal_feasibility's bare 'can i save' cue collided with this general
  // advice phrasing and answered with an unrelated specific goal's
  // feasibility instead. Requiring a number/currency/'enough' right after
  // 'can i save' keeps the cue for actual target questions only.
  const r = ask('how can I save more money', CTX);
  assert.strictEqual(r.intent, 'save_more');
});

test('a genuine goal-feasibility question is still recognised as one', () => {
  const r = ask('can I save 20000 by December, is that realistic', CTX);
  assert.strictEqual(r.intent, 'goal_feasibility');
});

// ─── End to end ──────────────────────────────────────────────────────────────
section('End to end');

const answered = (q) => {
  const r = ask(q, CTX);
  assert.strictEqual(r.source, 'mira', `fell back to the legacy engine (intent: ${r.intent})`);
  assert.ok(r.text && r.text.length > 10, 'empty answer');
  return r;
};

test('"How much did I spend on food last month?" gives the real figure', () => {
  const r = answered('How much did I spend on food last month?');
  assert.ok(r.text.includes('5,150'), `expected ₹5,150 in: ${r.text}`);
});

test('merchant + period question is answered', () => {
  const r = answered('how much at Swiggy in August');
  assert.ok(r.text.includes('3,300'), `expected ₹3,300 in: ${r.text}`);
});

test('counting works', () => {
  const r = answered('how many times did I order from Swiggy');
  assert.ok(r.text.includes('4'), `expected 4 in: ${r.text}`);
});

test('affordability answers with a trade-off, not a bare yes', () => {
  const r = answered('Can I afford a 40000 laptop?');
  assert.ok(/₹40,000/.test(r.text));
  assert.ok(r.data.verdict, 'no verdict in the payload');
});

test('REGRESSION: comparison uses both named months', () => {
  const r = answered('Compare August to September');
  assert.ok(r.text.includes('August 2026') && r.text.includes('September 2026'),
    `both months should appear: ${r.text}`);
});

test('weekend pattern question is answered', () => {
  const r = answered('Did I spend more on weekends?');
  assert.ok(/weekend/i.test(r.text));
});

test('health check summarises', () => {
  const r = answered('How am I doing?');
  assert.ok(/savings rate/i.test(r.text));
});

test('an empty account never throws', () => {
  const empty = { transactions: [], budgets: [], goals: [], subscriptions: [], now: NOW };
  for (const q of ['how much did I spend on food last month', 'can I afford 5000',
                   'how am I doing', 'compare this month to last month', 'biggest expense']) {
    const r = ask(q, empty);
    assert.ok(r.text && r.text.length > 0, `empty answer for "${q}"`);
  }
});

// ─── Conversation memory ─────────────────────────────────────────────────────
section('Conversation memory');

test('a follow-up continues the previous question', () => {
  const first = ask('How much did I spend on Food last month?', CTX);
  const second = ask('What about September?', { ...CTX, memory: first.entities });
  assert.strictEqual(second.source, 'mira', `follow-up fell through (intent: ${second.intent})`);
  assert.ok(/Food/i.test(second.text), `should still be about Food: ${second.text}`);
  assert.ok(/September/i.test(second.text), `should switch to September: ${second.text}`);
});

test('REGRESSION: memory does not bleed into an unrelated question', () => {
  // After asking about Food, "compare August to September" is a NEW question
  // about overall spending — it used to inherit Food and silently narrow.
  const first = ask('How much did I spend on Food last month?', CTX);
  const second = ask('Compare August to September', { ...CTX, memory: first.entities });
  assert.ok(!/Food spending/i.test(second.text),
    `memory leaked into an unrelated question: ${second.text}`);
});

test('an explicit new subject overrides memory', () => {
  const first = ask('How much did I spend on Food last month?', CTX);
  const second = ask('How much did I spend on Travel last month?', { ...CTX, memory: first.entities });
  assert.ok(/Travel/i.test(second.text), `should be Travel: ${second.text}`);
});

test('unknown questions still get a useful reply', () => {
  const r = ask('what is the meaning of life', CTX);
  assert.ok(r.text && r.text.length > 20);
});

test('a handler throwing never takes down the request', () => {
  // Malformed rows: dates that cannot be parsed.
  const broken = { ...CTX, transactions: [{ type: 'expense', category: 'Food', amount: NaN, date: 'nonsense' }] };
  const r = ask('how much did I spend on food', broken);
  assert.ok(r.text, 'no answer produced');
});

// ─── Result ──────────────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
