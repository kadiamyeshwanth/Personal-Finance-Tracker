/**
 * mira/index.js — Mira, the Clario assistant.
 *
 * Pipeline:   message → entities → intent → query → answer
 *
 * Entirely local and deterministic: no API key, no network call, no user data
 * leaving the server. That is a product promise, not an implementation detail —
 * personal-finance questions are aggregations over a small schema, so they are
 * better served by a parser and a query engine than by a language model.
 *
 * Anything Mira cannot answer specifically is handed to the original
 * rule-based engine, whose conversational advice (tips, debt, investing) is
 * still good. So this is strictly additive: previously-working answers keep
 * working, and specific questions now get specific answers.
 */

const { extract } = require('./entities');
const { normalizeSlang } = require('./slang');
const { detect }  = require('./intents');
const Q           = require('./query');
const { previousPeriod, describeRange, parseComparisonRanges } = require('./dates');
const { generateResponse: legacyResponse } = require('../chatEngine');

const NAME = 'Mira';

const inr  = (n) => `₹${Math.round(Math.abs(n || 0)).toLocaleString('en-IN')}`;
const pct  = (n) => `${Math.round(n)}%`;
/**
 * " in August 2026" / " last month" — labels that are already adverbial read
 * wrong with a preposition in front ("in last month"), so they skip it.
 */
const BARE_LABELS = /^(?:this|last|the last|today|yesterday)\b/i;
const when = (range) => {
  if (!range) return '';
  const label = describeRange(range);
  return BARE_LABELS.test(label) ? ` ${label}` : ` in ${label}`;
};

/** Answers carry the data behind them so the UI can render a chart or link. */
const answer = (text, data = {}) => ({ text, data, source: 'mira' });

// ─── Intent handlers ─────────────────────────────────────────────────────────
// Each returns an answer, or null to fall through to the legacy engine.

const handlers = {
  spend_query: (e, ctx) => {
    const rows  = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    const total = Q.sum(rows);
    const what  = e.merchant ? `at ${e.merchant}` : e.category ? `on ${e.category}` : '';

    if (rows.length === 0) {
      return answer(`I can't find any ${e.category || e.merchant || 'spending'}${when(e.range)}. ${
        e.range ? 'Try a wider period,' : 'Try naming a category,'} or add the transactions first.`);
    }
    const lines = [`You spent **${inr(total)}** ${what}${when(e.range)}.`];
    lines.push(`That's ${rows.length} transaction${rows.length > 1 ? 's' : ''}, averaging ${inr(total / rows.length)} each.`);

    // A comparison is the part that makes a number mean something.
    if (e.range) {
      const prev = previousPeriod(e.range);
      const before = Q.sum(Q.filter(ctx.transactions, { ...e, range: prev, type: 'expense' }));
      if (before > 0) {
        const diff = total - before;
        const dpct = Math.round((diff / before) * 100);
        lines.push(diff >= 0
          ? `That's ${inr(diff)} (${pct(Math.abs(dpct))}) **more** than ${prev.label}.`
          : `That's ${inr(-diff)} (${pct(Math.abs(dpct))}) **less** than ${prev.label}. Nice.`);
      }
    }
    if (!e.category && !e.merchant) {
      const top = Q.byCategory(rows).slice(0, 3);
      if (top.length) lines.push(`\nBiggest categories: ${top.map(c => `**${c.name}** ${inr(c.amount)}`).join(' · ')}`);
    }
    return answer(lines.join('\n'), { total, count: rows.length, rows: rows.slice(0, 20) });
  },

  income_query: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'income' });
    const total = Q.sum(rows);
    if (rows.length === 0) return answer(`No income recorded${when(e.range)}.`);
    return answer(`You received **${inr(total)}**${when(e.range)}, across ${rows.length} payment${rows.length > 1 ? 's' : ''}.`,
      { total, count: rows.length });
  },

  merchant_query: (e, ctx) => {
    if (!e.merchant) return null;
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    if (rows.length === 0) return answer(`Nothing at ${e.merchant}${when(e.range)}.`);
    const total = Q.sum(rows);
    return answer(
      `**${e.merchant}**: ${inr(total)} across ${rows.length} visit${rows.length > 1 ? 's' : ''}${when(e.range)}, ` +
      `averaging ${inr(total / rows.length)}.`,
      { total, count: rows.length, rows: rows.slice(0, 20) });
  },

  count_query: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    const label = e.merchant || e.category || 'transactions';
    return answer(`**${rows.length}** time${rows.length === 1 ? '' : 's'} — ${label}${when(e.range)}, totalling ${inr(Q.sum(rows))}.`,
      { count: rows.length });
  },

  biggest: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    if (!rows.length) return answer(`Nothing to rank${when(e.range)} yet.`);
    const top = Q.biggest(rows, e.limit || 3);
    const list = top.map((t, i) =>
      `${i + 1}. **${inr(t.amount)}** — ${t.merchant || t.description || t.category} (${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
    ).join('\n');
    return answer(`Your biggest ${top.length > 1 ? `${top.length} expenses` : 'expense'}${when(e.range)}:\n\n${list}`,
      { rows: top });
  },

  list_transactions: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    if (!rows.length) {
      return answer(`Nothing matches that${when(e.range)}.` + (e.amount ? ` Nothing ${e.comparator === 'lt' ? 'under' : 'over'} ${inr(e.amount)}.` : ''));
    }
    const shown = Q.biggest(rows, e.limit || 8);
    const list = shown.map(t =>
      `· **${inr(t.amount)}** — ${t.merchant || t.description || t.category} · ${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    ).join('\n');
    const more = rows.length > shown.length ? `\n\n…and ${rows.length - shown.length} more. Total ${inr(Q.sum(rows))}.` : '';
    const qualifier = e.amount ? ` ${e.comparator === 'lt' ? 'under' : 'over'} ${inr(e.amount)}` : '';
    return answer(`${rows.length} transaction${rows.length > 1 ? 's' : ''}${qualifier}${when(e.range)}:\n\n${list}${more}`,
      { rows: shown, total: Q.sum(rows) });
  },

  compare: (e, ctx) => {
    // "August vs September" names both sides explicitly; only fall back to
    // "this period vs the one before it" when the user named just one.
    const pair = parseComparisonRanges(ctx.message, ctx.now);
    const current = pair ? pair.b : (e.range || { from: new Date(ctx.now.getFullYear(), ctx.now.getMonth(), 1), to: ctx.now, label: 'this month' });
    const prev    = pair ? pair.a : previousPeriod(current);
    const c = Q.compare(ctx.transactions, current, prev, { category: e.category, merchant: e.merchant });
    if (c.previous === 0 && c.current === 0) return answer(`No spending in either ${current.label} or ${prev.label}.`);
    const subject = e.category ? `${e.category} spending` : e.merchant ? `spending at ${e.merchant}` : 'Spending';
    const dir = c.delta >= 0 ? 'up' : 'down';
    return answer(
      `${subject}: **${inr(c.current)}** in ${current.label} vs **${inr(c.previous)}** in ${prev.label}.\n\n` +
      `That's ${dir} ${inr(Math.abs(c.delta))}${c.pct !== null ? ` (${pct(Math.abs(c.pct))})` : ''}.` +
      (c.delta > 0 ? ' Worth a look at what changed.' : ' Good direction.'),
      c);
  },

  affordability: (e, ctx) => {
    if (e.amount == null) return null;
    const a = Q.affordability(ctx.transactions, e.amount, ctx.now);
    const head = `**${inr(e.amount)}** — here's the honest picture:`;
    const basis = `\n\n*Based on ${a.basedOnMonths} month${a.basedOnMonths === 1 ? '' : 's'} of your data.*`;

    const bodies = {
      no_surplus: `You're currently spending everything you earn, so this would have to come out of savings or credit. I'd hold off until there's a monthly surplus to draw on.`,
      comfortable: `Yes — comfortably. You have roughly ${inr(a.thisMonthHeadroom)} of headroom this month even after your usual spending, so this fits without touching savings.`,
      tight: `Yes, but it's tight. It's about ${a.monthsToSave} month${a.monthsToSave === 1 ? '' : 's'} of your ${inr(a.monthlySurplus)} surplus — doable this month, but it leaves nothing spare.`,
      save_first: `Not in one go. At your current surplus of ${inr(a.monthlySurplus)}/month it's about **${a.monthsToSave} months** of saving. Setting it up as a goal would make it happen on purpose rather than by accident.`,
      out_of_reach: `Not soon. At ${inr(a.monthlySurplus)}/month spare it would take about **${a.monthsToSave} months**. Either the amount needs to come down or the surplus needs to go up.`,
    };
    return answer(`${head}\n\n${bodies[a.verdict]}${basis}`, a);
  },

  forecast: (e, ctx) => {
    const p = Q.projectMonth(ctx.transactions, ctx.now);
    if (p.spent === 0) return answer(`Nothing recorded this month yet, so there's nothing to project from.`);

    // Asking about NEXT month is a different question from how this one lands.
    if (/next month/i.test(ctx.message || '')) {
      const avg = Q.monthlyAverages(ctx.transactions);
      return answer(
        `Going on your last ${avg.months} month${avg.months === 1 ? '' : 's'}, next month looks like about **${inr(avg.expense)}** of spending against ${inr(avg.income)} of income — roughly ${inr(avg.surplus)} left over.

` +
        `This month is currently tracking toward ${inr(p.projected)}, so if that holds it'd be ${p.projected > avg.expense ? 'heavier' : 'lighter'} than your norm.`,
        { ...avg, projectedThisMonth: p.projected });
    }
    const lines = [
      `You've spent **${inr(p.spent)}** in ${p.daysElapsed} days — about ${inr(p.dailyRate)}/day.`,
      `At that rate you'll finish the month around **${inr(p.projected)}**, with ${inr(p.remaining)} still to go over the next ${p.daysLeft} days.`,
    ];
    const budgetTotal = (ctx.budgets || []).reduce((s, b) => s + b.limit, 0);
    if (budgetTotal > 0) {
      lines.push(p.projected > budgetTotal
        ? `That's ${inr(p.projected - budgetTotal)} **over** your combined budgets of ${inr(budgetTotal)}.`
        : `That keeps you inside your combined budgets of ${inr(budgetTotal)}.`);
    }
    lines.push(`\n*A straight-line projection from this month so far — a quiet fortnight would change it.*`);
    return answer(lines.join('\n'), p);
  },

  day_pattern: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    if (rows.length < 3) return answer(`Not enough transactions yet to see a pattern.`);
    const d = Q.byDayType(rows);
    const worst = Q.worstDay(rows);
    const lines = [
      `Weekends average **${inr(d.weekendAvg)}** per transaction; weekdays **${inr(d.weekdayAvg)}**.`,
      d.premiumPct > 5  ? `You spend about ${pct(d.premiumPct)} more per weekend transaction.`
      : d.premiumPct < -5 ? `Weekends are actually ${pct(Math.abs(d.premiumPct))} cheaper for you.`
      : `They're close — no real weekend effect.`,
    ];
    if (worst) lines.push(`Your costliest day overall is **${worst.day}** (${inr(worst.amount)} in total).`);
    return answer(lines.join('\n'), { ...d, worst });
  },

  goal_feasibility: (e, ctx) => {
    const goals = ctx.goals || [];
    if (e.amount != null && goals.length === 0) {
      const a = Q.affordability(ctx.transactions, e.amount, ctx.now);
      if (!a.monthsToSave) return answer(`You'd need a monthly surplus before saving ${inr(e.amount)} is realistic — right now spending matches income.`);
      return answer(`Saving **${inr(e.amount)}** would take about **${a.monthsToSave} months** at your current surplus of ${inr(a.monthlySurplus)}/month.`, a);
    }
    if (goals.length === 0) return answer(`You haven't set any goals yet. Create one and I'll tell you whether the timing is realistic.`);
    const lines = goals.slice(0, 4).map((g) => {
      const p = Q.goalProjection(ctx.transactions, g);
      if (!p.feasible) return `· **${g.name}** — ${inr(p.remaining)} to go, but there's no monthly surplus to fund it right now.`;
      const eta = p.eta.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const verdict = p.onTrackForDeadline === false ? ' — **behind** your deadline' : p.onTrackForDeadline ? ' — on track' : '';
      return `· **${g.name}** — ${inr(p.remaining)} to go, about ${p.monthsNeeded} months (${eta})${verdict}.`;
    });
    return answer(`At your current surplus:\n\n${lines.join('\n')}`, { goals: goals.length });
  },

  savings_status: (e, ctx) => {
    const inc = Q.sum(Q.filter(ctx.transactions, { range: e.range, type: 'income' }));
    const exp = Q.sum(Q.filter(ctx.transactions, { range: e.range, type: 'expense' }));
    if (inc === 0 && exp === 0) return answer(`No activity${when(e.range)}.`);
    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;
    const verdict = rate >= 20 ? `That's above the 20% mark — genuinely good.`
      : rate >= 10 ? `Decent, though 20% is the target worth aiming at.`
      : rate >= 0  ? `That's thin. Trimming your top category is the fastest lever.`
      : `You're spending more than you earn${when(e.range)}.`;
    return answer(`In${when(e.range) || ' total'}: **${inr(inc)}** in, **${inr(exp)}** out, leaving **${inr(net)}** — a ${rate}% savings rate.\n\n${verdict}`,
      { income: inc, expenses: exp, net, rate });
  },

  health_check: (e, ctx) => {
    const p = Q.projectMonth(ctx.transactions, ctx.now);
    const avg = Q.monthlyAverages(ctx.transactions);
    const rate = avg.income > 0 ? Math.round((avg.surplus / avg.income) * 100) : 0;
    const top = Q.byCategory(Q.filter(ctx.transactions, {
      range: { from: new Date(ctx.now.getFullYear(), ctx.now.getMonth(), 1), to: ctx.now }, type: 'expense',
    }))[0];
    const lines = [
      `Across ${avg.months} month${avg.months === 1 ? '' : 's'} you average **${inr(avg.income)}** in and **${inr(avg.expense)}** out — a ${rate}% savings rate.`,
      `This month you're at ${inr(p.spent)}, tracking toward about ${inr(p.projected)}.`,
    ];
    if (top) lines.push(`**${top.name}** is your heaviest category so far at ${inr(top.amount)}.`);
    lines.push(rate >= 20 ? `\nOverall: healthy. The useful next step is putting the surplus to work rather than letting it sit.`
      : rate >= 0 ? `\nOverall: stable but thin. One category trimmed 20% would move the rate noticeably.`
      : `\nOverall: you're running at a deficit. Worth looking at the top two categories this week.`);
    return answer(lines.join('\n'), { rate, ...p });
  },

  top_spending: (e, ctx) => {
    const rows = Q.filter(ctx.transactions, { ...e, type: 'expense' });
    if (!rows.length) return answer(`No expenses${when(e.range)} to break down yet.`);
    const cats = Q.byCategory(rows).slice(0, e.limit || 5);
    const total = Q.sum(rows);
    const list = cats.map((c, i) =>
      `${i + 1}. **${c.name}** — ${inr(c.amount)} (${pct((c.amount / total) * 100)})`).join('\n');
    return answer(`Where your money went${when(e.range)} — ${inr(total)} in total:\n\n${list}`, { categories: cats, total });
  },

  subscriptions: (e, ctx) => {
    const subs = (ctx.subscriptions || []).filter(s => s.status === 'active');
    if (subs.length === 0) return answer(`No subscriptions tracked yet. If you add them, I can total the monthly cost and flag the ones you barely use.`);
    const monthly = subs.reduce((s, x) => s + (x.monthlyEquivalent || x.amount), 0);
    const list = subs.slice(0, 6).map(s => `· **${s.name}** — ${inr(s.monthlyEquivalent || s.amount)}/month`).join('\n');
    return answer(`${subs.length} active subscription${subs.length > 1 ? 's' : ''}, **${inr(monthly)}/month** (${inr(monthly * 12)}/year):\n\n${list}` +
      (monthly > 2000 ? `\n\nThat's a meaningful chunk — worth asking which you actually opened this month.` : ''),
      { monthly, count: subs.length });
  },

  help: () => answer(
    `I'm **${NAME}** — I read your transactions and answer questions about them. Nothing leaves this server.\n\n` +
    `Things I can answer:\n` +
    `· *"How much did I spend on Food last month?"*\n` +
    `· *"How much at Swiggy in August?"*\n` +
    `· *"Compare this month to last month"*\n` +
    `· *"Can I afford a ₹40,000 laptop?"*\n` +
    `· *"What will I spend by month end?"*\n` +
    `· *"Show me everything over ₹3,000"*\n` +
    `· *"Do I spend more at weekends?"*\n` +
    `· *"How am I doing?"*`),

  identity: () => answer(
    `I'm **${NAME}** — Clario's assistant. I read your transactions and answer questions about them directly; nothing you type here leaves this server.\n\n` +
    `Ask me something like *"how much did I spend on Food last month?"* or *"can I afford a ₹40,000 laptop?"*`),

  greeting: (e, ctx) => {
    const p = Q.projectMonth(ctx.transactions, ctx.now);
    return answer(`Hello — I'm **${NAME}**.\n\n` +
      (p.spent > 0
        ? `You're at ${inr(p.spent)} so far this month, tracking toward about ${inr(p.projected)}.`
        : `Nothing recorded this month yet.`) +
      `\n\nAsk me anything about your money — try *"how much did I spend on Food last month?"* or *"how am I doing?"*`);
  },

  thanks: () => answer(`Any time. Ask me whenever you want a number checked.`),
};

/**
 * Ask Mira a question.
 *
 * @param {string} message
 * @param {object} ctx - { transactions, budgets, goals, subscriptions, now, memory }
 * @returns {{ text, data, source, intent, entities }}
 */
const ask = (rawMessage, ctx = {}) => {
  const now = ctx.now || new Date();
  const transactions = ctx.transactions || [];

  // Expand common texting shorthand ('u' -> 'you', 'ur' -> 'your'...) before
  // anything else runs, so both Mira's own matching and the legacy engine's
  // fallback see the same, more matchable text. This is a fixed dictionary,
  // not language understanding — see slang.js for exactly what it covers and
  // why it stops there.
  const message = normalizeSlang(rawMessage);

  // Vocabulary comes from the user's own data, so matching is grounded in
  // categories and merchants that actually exist for them.
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
  const merchants  = [...new Set(transactions.map(t => t.merchant).filter(Boolean))];

  let entities = extract(message, { categories, merchants, now });

  // ── Conversation memory ────────────────────────────────────────────────────
  // Only a *follow-up* inherits from the previous turn. Applying memory to every
  // message made it bleed: after asking about Food, a plain "compare August to
  // September" came back scoped to Food, silently answering a narrower question
  // than the one asked. A follow-up is a short fragment that leans on the turn
  // before it — "what about September?", "and last month?", "in August?".
  const memory = ctx.memory || {};
  const text = String(message || '').trim();
  const isFollowUp =
    /^(?:what|how)\s+about\b/i.test(text) ||
    /^and\b/i.test(text) ||
    /^(?:in|for|during)\s+[\w\s]{2,20}\??$/i.test(text) ||
    (text.split(/\s+/).length <= 3 && !/\?$|^(hi|hey|hello|help|thanks)\b/i.test(text));

  if (isFollowUp) {
    if (!entities.category && !entities.merchant) {
      if (memory.category) entities.category = memory.category;
      else if (memory.merchant) entities.merchant = memory.merchant;
    }
    if (!entities.range && memory.range) {
      entities.range = { ...memory.range, from: new Date(memory.range.from), to: new Date(memory.range.to) };
    }
  }

  let { intent } = detect(message, entities);
  // A follow-up carries no intent cue of its own ("what about September?"), so
  // it continues whatever question was being asked.
  if (isFollowUp && (intent === 'unknown' || intent === 'merchant_query') && memory.intent) {
    intent = memory.intent;
  }
  const full = { ...ctx, now, transactions, categories, merchants, message };

  let result = null;
  if (handlers[intent]) {
    try { result = handlers[intent](entities, full); }
    catch { result = null; }              // never let a handler take the request down
  }

  // Anything Mira can't answer specifically falls back to the original engine,
  // which still handles open advice (saving, debt, investing) well.
  if (!result) {
    // Mira's own detector is more capable than the legacy engine's (word
    // boundaries, scoring, entity-aware) — for the handful of intents she
    // recognises but has no dedicated handler for (save_more, budget_status,
    // investment_advice, …), hand the legacy engine her already-correct
    // intent directly rather than letting it re-guess from scratch with a
    // narrower pattern set that can easily land on 'general' instead.
    // Only when Mira herself found nothing ('unknown') does the legacy
    // engine fall back to detecting on its own.
    const text = legacyResponse(message, {
      transactions, budgets: ctx.budgets || [], goals: ctx.goals || [], subscriptions: ctx.subscriptions || [],
    }, intent !== 'unknown' ? intent : undefined);
    result = { text, data: {}, source: 'legacy' };
  }

  return {
    ...result,
    intent,
    entities: {
      // Carried into the next turn so a follow-up can continue the thread.
      intent,
      category: entities.category || null,
      merchant: entities.merchant || null,
      range: entities.range ? { label: entities.range.label, from: entities.range.from, to: entities.range.to } : null,
      amount: entities.amount ?? null,
    },
  };
};

module.exports = { ask, NAME };
