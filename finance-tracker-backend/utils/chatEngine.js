/**
 * chatEngine.js — Local rule-based AI finance chat engine.
 * Provides intelligent, context-aware financial advice with NO external API.
 *
 * The engine:
 *  1. Parses user's message intent
 *  2. Analyses their actual financial data (transactions, budgets, goals)
 *  3. Generates a personalized, data-driven response
 */

// Intent patterns — map user phrases to response types
const INTENTS = [
  { pattern: /save more|saving more|how to save|increase savings/i,          intent: 'save_more' },
  { pattern: /biggest expense|top spend|most spend|where.*money|spending on/i, intent: 'top_spending' },
  { pattern: /budget|over budget|budget alert|spending limit/i,               intent: 'budget_status' },
  { pattern: /goal|target|milestone|saving for/i,                             intent: 'goals_status' },
  { pattern: /income|salary|earn/i,                                           intent: 'income_status' },
  { pattern: /subscription|netflix|spotify|ott|recurring charge/i,           intent: 'subscriptions' },
  { pattern: /invest|investment|mutual fund|stock|sip/i,                      intent: 'investment_advice' },
  { pattern: /debt|loan|emi|credit card|repay/i,                             intent: 'debt_advice' },
  { pattern: /emergency fund|emergency|safety net/i,                          intent: 'emergency_fund' },
  { pattern: /tip|advice|suggestion|recommend/i,                              intent: 'general_tips' },
  { pattern: /personality|type|kind of spender|spending style/i,              intent: 'personality' },
  { pattern: /this month|current month|monthly/i,                             intent: 'monthly_summary' },
  { pattern: /hello|hi|hey|start|begin/i,                                     intent: 'greeting' },
  { pattern: /thank|thanks|great|awesome|cool/i,                              intent: 'thanks' },
];

/**
 * Detect intent from user message.
 */
const detectIntent = (message) => {
  for (const { pattern, intent } of INTENTS) {
    if (pattern.test(message)) return intent;
  }
  return 'general';
};

/**
 * Format currency in Indian style.
 */
const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

/**
 * Generate a response based on intent and user's financial data.
 */
/**
 * @param {string} message
 * @param {object} ctx
 * @param {string} [forcedIntent] - skip this engine's own detectIntent() and
 *   answer as this intent instead. Mira (mira/index.js) uses this for the
 *   handful of intents she recognises but doesn't have a dedicated handler
 *   for yet (save_more, budget_status, …): her own word-boundary-aware,
 *   scored detector is more capable than this engine's original un-anchored
 *   regex scan, so re-running the weaker detector here would throw away a
 *   correct answer and could easily land on a different, wrong intent.
 */
const generateResponse = (message, { transactions = [], budgets = [], goals = [], subscriptions = [] }, forcedIntent) => {
  const intent = forcedIntent || detectIntent(message);

  const expenses = transactions.filter(t => t.type === 'expense' && !t.isRecurring);
  const income   = transactions.filter(t => t.type === 'income'  && !t.isRecurring);
  const totalInc = income.reduce((s, t) => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const net      = totalInc - totalExp;
  const savingsRate = totalInc > 0 ? Math.round((net / totalInc) * 100) : 0;

  // Category breakdown
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  switch (intent) {
    case 'greeting':
      return `👋 Hello! I'm your **AI Finance Assistant**. I can see all your transactions, budgets, and goals — so my advice is 100% personalised to *you*.\n\nHere's what I know about your finances:\n- **Income**: ${fmt(totalInc)}\n- **Expenses**: ${fmt(totalExp)}\n- **Savings**: ${fmt(net)} (${savingsRate}% rate)\n\nWhat would you like to know? Try asking: *"Where is most of my money going?"* or *"How can I save more?"*`;

    case 'save_more': {
      const tips = [];
      if (topCats[0]) tips.push(`- Your biggest expense is **${topCats[0][0]}** at ${fmt(topCats[0][1])}. Even reducing this by 20% saves you ${fmt(topCats[0][1] * 0.2)}/month.`);
      const subTotal = subscriptions.filter(s => s.status === 'active').reduce((s, sub) => s + sub.monthlyEquivalent, 0);
      if (subTotal > 500) tips.push(`- You spend **${fmt(subTotal)}/month** on subscriptions. Cancel ones you rarely use.`);
      if (savingsRate < 20) tips.push(`- Aim for the **50/30/20 rule**: 50% needs, 30% wants, 20% savings. You're currently saving ${savingsRate}%.`);
      tips.push(`- Set up **automatic transfers** to savings on payday before you can spend it.`);
      tips.push(`- Try a **no-spend day** twice a week — that's 8–9 extra days of savings/month!`);

      return `💡 **How to save more money — personalised for you:**\n\n${tips.join('\n')}\n\n${savingsRate >= 20 ? '🎉 You\'re already saving well! Focus on investing the surplus.' : `If you save 5% more, that's an extra ${fmt(totalInc * 0.05)}/month.`}`;
    }

    case 'top_spending': {
      if (topCats.length === 0) return `📊 I don't see enough expense data yet. Add some transactions and I can tell you where your money is going!`;
      const list = topCats.slice(0, 5).map(([cat, amt], i) =>
        `${i + 1}. **${cat}** — ${fmt(amt)} (${totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0}% of expenses)`
      ).join('\n');
      return `📊 **Where your money is going:**\n\n${list}\n\n${topCats[0] ? `💡 **${topCats[0][0]}** is your biggest category. ${topCats[0][1] > totalInc * 0.3 ? 'That\'s over 30% of your income — worth reviewing!' : 'This looks reasonable.'}` : ''}`;
    }

    case 'budget_status': {
      if (budgets.length === 0) return `📋 You haven't set any budgets yet! Go to the **Budgets** page to set monthly limits for each category. It's the single most effective way to control spending.`;
      const spendMap = {};
      expenses.forEach(t => { spendMap[t.category] = (spendMap[t.category] || 0) + t.amount; });
      const exceeded  = budgets.filter(b => (spendMap[b.category] || 0) > b.limit);
      const nearLimit = budgets.filter(b => { const pct = ((spendMap[b.category] || 0) / b.limit) * 100; return pct >= 80 && pct <= 100; });
      const onTrack   = budgets.filter(b => ((spendMap[b.category] || 0) / b.limit) * 100 < 80);

      let resp = `📋 **Your budget status:**\n\n`;
      if (exceeded.length > 0)  resp += `🔴 **Exceeded** (${exceeded.length}): ${exceeded.map(b => `${b.category} (${fmt(spendMap[b.category] || 0)} / ${fmt(b.limit)})`).join(', ')}\n`;
      if (nearLimit.length > 0) resp += `🟡 **Near limit** (${nearLimit.length}): ${nearLimit.map(b => b.category).join(', ')}\n`;
      if (onTrack.length > 0)   resp += `🟢 **On track** (${onTrack.length}): ${onTrack.map(b => b.category).join(', ')}\n`;

      if (exceeded.length > 0) resp += `\n⚠️ You've exceeded ${exceeded.length} budget${exceeded.length > 1 ? 's' : ''}. Try reducing ${exceeded[0].category} spending for the rest of the month.`;
      return resp;
    }

    case 'goals_status': {
      if (goals.length === 0) return `🎯 You haven't created any financial goals yet! Go to **Goals** and set a target — it could be an emergency fund, a trip, a phone, or anything that motivates you.`;
      const goalList = goals.slice(0, 4).map(g => {
        const pct = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
        const remaining = g.targetAmount - g.currentAmount;
        return `- **${g.name}**: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} (${pct}%) — ${fmt(remaining)} to go`;
      }).join('\n');
      return `🎯 **Your financial goals:**\n\n${goalList}\n\n${goals[0] ? `💪 You're closest to completing **${goals.sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount))[0].name}**. Keep it up!` : ''}`;
    }

    case 'income_status':
      return `💰 **Your income overview:**\n\n- **Total income**: ${fmt(totalInc)}\n- **Total expenses**: ${fmt(totalExp)}\n- **Net savings**: ${fmt(net)}\n- **Savings rate**: ${savingsRate}%\n\n${savingsRate >= 20 ? '✅ Excellent! You\'re saving more than 20% — the financial golden rule.' : savingsRate >= 10 ? '👍 Good start! Try to push towards 20% savings rate.' : '⚠️ Your savings rate is below 10%. Focus on reducing your top 2 expense categories.'}`;

    case 'subscriptions': {
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      if (activeSubs.length === 0) return `📺 You haven't added any subscriptions yet. Add them on the **Subscriptions** page to track your recurring costs.`;
      const total = activeSubs.reduce((s, sub) => s + (sub.monthlyEquivalent || sub.amount), 0);
      const subList = activeSubs.slice(0, 5).map(s => `- **${s.name}**: ${fmt(s.monthlyEquivalent || s.amount)}/month`).join('\n');
      return `📺 **Your active subscriptions:**\n\n${subList}\n\n💰 Total: **${fmt(total)}/month** (${fmt(total * 12)}/year)\n\n${total > 2000 ? '⚠️ Your subscription spend is high. Audit each one — when did you last use each service?' : '✅ Subscription costs look reasonable.'}`;
    }

    case 'investment_advice': {
      const safeToInvest = Math.max(0, net * 0.5); // 50% of surplus
      return `📈 **Investment advice based on your finances:**\n\n- Your current monthly surplus is approx. **${fmt(net)}**\n- A safe amount to consider investing: **${fmt(safeToInvest)}/month**\n\n**Recommended order of priorities:**\n1. 🏦 Build a 6-month emergency fund first (${fmt(totalExp * 6)})\n2. 📊 Start a SIP in an index fund (low risk, long-term)\n3. 💼 Consider PPF or NPS for tax benefits\n4. 📈 Only then explore individual stocks/crypto\n\n*This is general guidance, not financial advice. Consult a SEBI-registered advisor for personalised investment planning.*`;
    }

    case 'debt_advice':
      return `💳 **Debt management tips:**\n\n1. **Avalanche method**: Pay the highest-interest debt first (saves the most money)\n2. **Snowball method**: Pay the smallest debt first (for motivation)\n3. Always pay at least the minimum on all debts\n4. Avoid taking new debt while repaying existing ones\n5. Credit card debt at 36–42% annual interest is extremely expensive — pay it off before investing\n\nGo to your **Transactions** page and add your loan payments as expenses in a "Debt" category to track them properly.`;

    case 'emergency_fund':
      return `🆘 **Emergency Fund Calculator:**\n\nYour average monthly expense is **${fmt(totalExp / Math.max(1, new Set(transactions.map(t => new Date(t.date).getMonth())).size))}**\n\n- **3-month target**: ${fmt(totalExp / Math.max(1, 3) * 3)}\n- **6-month target** (recommended): ${fmt(totalExp * 2)}\n\n💡 Keep your emergency fund in a high-interest savings account or liquid mutual fund — NOT in stocks or crypto. It should be accessible within 24 hours.`;

    case 'personality':
      return `🧠 **Your spending personality** is determined by:\n- How often you make impulse buys\n- Your savings rate (${savingsRate}%)\n- Whether you stick to budgets\n- When you spend (late night vs daytime)\n\nCheck the **AI Insights** page for your full personality analysis with your financial archetype!`;

    case 'monthly_summary': {
      const now = new Date();
      const thisMonthExp = expenses.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, t) => s + t.amount, 0);
      const thisMonthInc = income.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, t) => s + t.amount, 0);
      const days = now.getDate();
      return `📅 **This month so far (${days} days):**\n\n- Income: ${fmt(thisMonthInc)}\n- Expenses: ${fmt(thisMonthExp)}\n- Net: ${fmt(thisMonthInc - thisMonthExp)}\n- Daily avg spend: ${fmt(Math.round(thisMonthExp / days))}\n\n${thisMonthExp > thisMonthInc ? '⚠️ Spending exceeds income this month.' : '✅ You\'re in the green this month!'}`;
    }

    case 'general_tips':
      return `💡 **Personalised financial tips:**\n\n${topCats[0] ? `1. Your #1 expense category is **${topCats[0][0]}** — review if all purchases there were necessary.\n` : ''}${savingsRate < 20 ? `2. Save **before** you spend — transfer ${fmt(totalInc * 0.2)} to savings on payday.\n` : '2. You\'re saving well! Consider investing the surplus in index funds.\n'}3. Track every expense for the next 30 days — awareness alone reduces spending by 15%.\n4. The 24-hour rule: wait a day before any purchase > ₹2,000.\n5. Set a monthly "no-spend weekend" challenge.`;

    case 'thanks':
      return `😊 Happy to help! Is there anything else you'd like to know about your finances? You can ask me about:\n- Spending categories\n- Budget status\n- Goal progress\n- How to save more\n- Investment basics`;

    default:
      return `🤔 I didn't quite understand that. Here's what I can help with:\n\n- **"Where is my money going?"** — spending breakdown\n- **"How can I save more?"** — personalised savings tips\n- **"What's my budget status?"** — budget adherence\n- **"Tell me about my goals"** — goal progress\n- **"This month's summary"** — monthly overview\n- **"Investment advice"** — where to put your surplus\n\nWhat would you like to know?`;
  }
};

module.exports = { generateResponse, detectIntent };
