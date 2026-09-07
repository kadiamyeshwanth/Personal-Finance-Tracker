/**
 * mira/query.js — run a parsed question against the user's transactions.
 *
 * This is what makes the assistant general. Personal-finance questions are
 * overwhelmingly aggregations over a small schema — how much, how often, which
 * biggest, compared to when — so once the question is parsed into slots, one
 * set of primitives answers a very large number of question shapes without a
 * hand-written branch for each.
 *
 * Everything here is pure: it takes rows in and returns numbers out.
 */

const inRange = (t, range) => {
  if (!range) return true;
  const d = new Date(t.date);
  return d >= range.from && d <= range.to;
};

const eqi = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

/**
 * Narrow a transaction list by the extracted slots.
 * `isRecurring` templates are always excluded — they are schedules, not spend.
 */
const filter = (transactions, { range, category, merchant, type, comparator, amount } = {}) =>
  transactions.filter((t) => {
    if (t.isRecurring) return false;
    if (type && t.type !== type) return false;
    if (!inRange(t, range)) return false;
    if (category && !eqi(t.category, category)) return false;
    if (merchant && !eqi(t.merchant, merchant)) return false;
    if (comparator === 'gt' && !(t.amount > amount)) return false;
    if (comparator === 'lt' && !(t.amount < amount)) return false;
    return true;
  });

const sum   = (rows) => rows.reduce((s, t) => s + (t.amount || 0), 0);
const count = (rows) => rows.length;

/** Total per category, biggest first. */
const byCategory = (rows) => {
  const map = {};
  rows.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/** Total and visit count per merchant, biggest first. */
const byMerchant = (rows) => {
  const map = {};
  rows.forEach((t) => {
    const m = (t.merchant || '').trim();
    if (!m) return;
    map[m] = map[m] || { name: m, amount: 0, visits: 0 };
    map[m].amount += t.amount;
    map[m].visits += 1;
  });
  return Object.values(map).sort((a, b) => b.amount - a.amount);
};

const biggest = (rows, n = 1) => [...rows].sort((a, b) => b.amount - a.amount).slice(0, n);

/** Weekend vs weekday averages — answers "do I spend more at weekends?" */
const byDayType = (rows) => {
  const weekend = rows.filter((t) => [0, 6].includes(new Date(t.date).getDay()));
  const weekday = rows.filter((t) => ![0, 6].includes(new Date(t.date).getDay()));
  const avg = (list) => (list.length ? sum(list) / list.length : 0);
  return {
    weekendTotal: sum(weekend), weekdayTotal: sum(weekday),
    weekendAvg: avg(weekend),   weekdayAvg: avg(weekday),
    weekendCount: weekend.length, weekdayCount: weekday.length,
    premiumPct: avg(weekday) > 0 ? Math.round(((avg(weekend) - avg(weekday)) / avg(weekday)) * 100) : 0,
  };
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Which weekday costs the most in total. */
const worstDay = (rows) => {
  const totals = new Array(7).fill(0);
  rows.forEach((t) => { totals[new Date(t.date).getDay()] += t.amount; });
  const max = Math.max(...totals);
  if (max <= 0) return null;
  return { day: DAY_NAMES[totals.indexOf(max)], amount: max };
};

/**
 * Month-end projection from the burn rate so far.
 *
 * Deliberately reports the daily rate and days elapsed alongside the number, so
 * the answer can be honest about being an extrapolation rather than a promise.
 */
const projectMonth = (transactions, now = new Date()) => {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth  = now.getDate();
  const rows = filter(transactions, { range: { from, to: now }, type: 'expense' });
  const spent = sum(rows);
  const dailyRate = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const projected = Math.round(dailyRate * daysInMonth);
  return {
    spent, dailyRate: Math.round(dailyRate), projected,
    daysElapsed: dayOfMonth, daysLeft: daysInMonth - dayOfMonth, daysInMonth,
    remaining: Math.max(0, projected - spent),
  };
};

/**
 * A month-by-month average of real spending, used for affordability and goals.
 * Averages only over months that actually have data, so a new account with two
 * weeks of history isn't judged as if it were a full year.
 */
const monthlyAverages = (transactions) => {
  const months = {};
  transactions.filter((t) => !t.isRecurring).forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = months[key] || { income: 0, expense: 0 };
    months[key][t.type === 'income' ? 'income' : 'expense'] += t.amount;
  });
  const keys = Object.keys(months);
  if (keys.length === 0) return { income: 0, expense: 0, surplus: 0, months: 0 };
  const income  = keys.reduce((s, k) => s + months[k].income, 0)  / keys.length;
  const expense = keys.reduce((s, k) => s + months[k].expense, 0) / keys.length;
  return { income, expense, surplus: income - expense, months: keys.length };
};

/**
 * Can they afford `amount`?
 *
 * Answers with the surplus it would consume and how long it would take to
 * rebuild — never a bare yes/no, because the useful part is the trade-off.
 */
const affordability = (transactions, amount, now = new Date()) => {
  const avg = monthlyAverages(transactions);
  const proj = projectMonth(transactions, now);
  const surplus = avg.surplus;
  const monthsToSave = surplus > 0 ? amount / surplus : Infinity;
  const thisMonthHeadroom = Math.round(avg.income - proj.projected);

  let verdict;
  if (surplus <= 0)                       verdict = 'no_surplus';
  else if (amount <= thisMonthHeadroom)   verdict = 'comfortable';
  else if (monthsToSave <= 1)             verdict = 'tight';
  else if (monthsToSave <= 3)             verdict = 'save_first';
  else                                    verdict = 'out_of_reach';

  return {
    amount, verdict,
    monthlySurplus: Math.round(surplus),
    monthsToSave: isFinite(monthsToSave) ? Math.round(monthsToSave * 10) / 10 : null,
    thisMonthHeadroom,
    basedOnMonths: avg.months,
  };
};

/** Compare two windows on the same measure. */
const compare = (transactions, rangeA, rangeB, opts = {}) => {
  const a = sum(filter(transactions, { ...opts, range: rangeA, type: opts.type || 'expense' }));
  const b = sum(filter(transactions, { ...opts, range: rangeB, type: opts.type || 'expense' }));
  const delta = a - b;
  const pct = b > 0 ? Math.round((delta / b) * 100) : null;
  return { current: a, previous: b, delta, pct };
};

/** How long until a savings goal is met at the current surplus. */
const goalProjection = (transactions, goal) => {
  const avg = monthlyAverages(transactions);
  const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
  if (avg.surplus <= 0) return { remaining, monthsNeeded: null, feasible: false, monthlySurplus: 0 };
  const monthsNeeded = remaining / avg.surplus;
  const eta = new Date();
  eta.setMonth(eta.getMonth() + Math.ceil(monthsNeeded));
  return {
    remaining,
    monthsNeeded: Math.round(monthsNeeded * 10) / 10,
    monthlySurplus: Math.round(avg.surplus),
    eta,
    feasible: true,
    onTrackForDeadline: goal.deadline ? eta <= new Date(goal.deadline) : null,
  };
};

module.exports = {
  filter, sum, count, byCategory, byMerchant, biggest, byDayType, worstDay,
  projectMonth, monthlyAverages, affordability, compare, goalProjection, DAY_NAMES,
};
