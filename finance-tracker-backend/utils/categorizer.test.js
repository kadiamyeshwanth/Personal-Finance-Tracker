/**
 * categorizer.test.js — regression suite for suggestCategory().
 *
 * Run: node utils/categorizer.test.js
 *
 * No test framework, matching utils/mira/mira.test.js: this needs to run with
 * nothing but `node`, and exits non-zero on failure so it can sit in CI as-is.
 *
 * Every case marked REGRESSION encodes a bug that was actually live in
 * production — a plain `String.includes()` scan with no word-boundary check
 * let short keywords match inside unrelated longer words ('tea' inside
 * 'steam', 'jio' inside 'ajio', 'bar' inside 'barbershop'), and "first
 * category declared wins" let a generic short keyword ('hotel', 'amazon',
 * 'mobile') beat a more specific multi-word phrase sitting right next to it
 * in the same map ('hotel booking', 'amazon prime', 'mobile bill'). Keep
 * these — they're the whole reason the algorithm looks the way it does.
 */

const assert = require('assert');
const { suggestCategory, KEYWORD_MAP } = require('./categorizer');

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  catch (err) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${err.message}`); }
};
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

// ─── False substring matches (the original bug class) ───────────────────────
section('Whole-word boundary matching');

test("REGRESSION: 'tea' does not match inside 'steam'", () => {
  assert.strictEqual(suggestCategory('steam wallet top up'), 'Entertainment');
});

test("REGRESSION: 'jio' does not match inside 'ajio'", () => {
  assert.strictEqual(suggestCategory('ajio order #4521'), 'Shopping');
});

test("REGRESSION: 'bar' does not match inside 'barbershop'", () => {
  assert.strictEqual(suggestCategory('barbershop'), 'Personal');
});

test('a real standalone occurrence of a short keyword still matches', () => {
  assert.strictEqual(suggestCategory('tea and coffee'), 'Food');
  assert.strictEqual(suggestCategory('a jio recharge'), 'Bills');
  assert.strictEqual(suggestCategory('bar hopping tonight'), 'Entertainment');
});

test('a keyword ending in a symbol matches at the end of a sentence', () => {
  // A generic \b regex never fires here (both neighbours of a trailing
  // symbol are "non-word"), which is why this needs its own case.
  assert.strictEqual(suggestCategory('disney+ subscription'), 'Entertainment');
});

// ─── Specificity: a longer phrase beats a shorter word it contains ──────────
section('Multi-word phrases outrank the single word they contain');

test("REGRESSION: 'hotel booking' (Travel) beats bare 'hotel' (Food)", () => {
  assert.strictEqual(suggestCategory('hotel booking confirmation'), 'Travel');
});

test("REGRESSION: 'amazon prime' (Entertainment) beats bare 'amazon' (Shopping)", () => {
  assert.strictEqual(suggestCategory('amazon prime video subscription'), 'Entertainment');
});

test("REGRESSION: 'mobile bill' (Bills) beats bare 'mobile' (Shopping)", () => {
  assert.strictEqual(suggestCategory('mobile bill payment'), 'Bills');
});

test("bare 'hotel' with no more specific phrase still falls back to Food", () => {
  // Indian English uses "hotel" for a restaurant — this is a genuine content
  // ambiguity in the keyword list, not a matching bug, and is left alone.
  assert.strictEqual(suggestCategory('hotel stay for the weekend'), 'Food');
});

test("bare 'amazon' or 'mobile' still resolve normally with no competing phrase", () => {
  assert.strictEqual(suggestCategory('Amazon purchase'), 'Shopping');
  assert.strictEqual(suggestCategory('new mobile purchase'), 'Shopping');
});

// ─── Specificity must not be measured in raw character count ───────────────
section('A generic word must not outrank a specific one just by being longer');

test("REGRESSION: 'zomato' (6 chars) beats the longer, generic 'delivery' (8 chars)", () => {
  // A length-based heuristic was tried first and fixed the phrase cases
  // above, but it also let Shopping's 'delivery' (8 chars) outscore Food's
  // 'zomato' (6 chars) for this input — a case the original, much simpler
  // code got right by the accident of Food being declared before Shopping.
  // Specificity is now measured in word count; two single-word matches from
  // different categories fall back to declaration order, same as before.
  assert.strictEqual(suggestCategory('Zomato delivery'), 'Food');
});

// ─── Every declared keyword resolves to its own category in isolation ──────
section('Every keyword in the map categorizes correctly on its own');

test('all keywords, tested individually, match their own declared category', () => {
  const mismatched = [];
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      const got = suggestCategory(keyword);
      if (got !== category) mismatched.push(`"${keyword}" declared under ${category}, got ${got}`);
    }
  }
  assert.strictEqual(mismatched.length, 0, `\n      ${mismatched.join('\n      ')}`);
});

// ─── Broad sanity sweep of ordinary, unambiguous cases ─────────────────────
section('Ordinary cases across every category');

const ordinary = [
  ['Swiggy order', 'Food'], ['Starbucks coffee', 'Food'],
  ['Ola cab ride', 'Travel'], ['IRCTC train booking', 'Travel'], ['IndiGo flight', 'Travel'],
  ['Flipkart order', 'Shopping'], ['Myntra clothes', 'Shopping'],
  ['Netflix subscription', 'Entertainment'], ['BookMyShow movie ticket', 'Entertainment'],
  ['BESCOM electricity bill', 'Bills'], ['Airtel recharge', 'Bills'],
  ['SIP mutual fund', 'Investment'],
  ['Apollo pharmacy', 'Health'], ['Cult fit membership', 'Health'],
  ['Udemy course', 'Education'], ['College fees', 'Education'],
  ['Salon haircut', 'Personal'], ['Dry cleaning', 'Personal'],
  ['Monthly salary credit', 'Salary'], ['Freelance project payment', 'Freelance'],
  ['Business sales revenue', 'Business'],
];
for (const [input, expected] of ordinary) {
  test(`"${input}" -> ${expected}`, () => {
    assert.strictEqual(suggestCategory(input), expected);
  });
}

test('no match returns null, not a guess', () => {
  assert.strictEqual(suggestCategory('random unrelated text xyz'), null);
});

test('empty or missing input returns null without throwing', () => {
  assert.strictEqual(suggestCategory(''), null);
  assert.strictEqual(suggestCategory(null), null);
  assert.strictEqual(suggestCategory(undefined), null);
});

// ─── Result ──────────────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
