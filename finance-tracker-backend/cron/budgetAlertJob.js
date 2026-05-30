/**
 * cron/budgetAlertJob.js — Daily budget alert checker.
 * Runs once per day, creates notifications when budgets >= 80% used.
 */
const Transaction  = require('../models/Transaction');
const Budget       = require('../models/Budget');
const Notification = require('../models/Notification');
const User         = require('../models/User');

const runBudgetAlerts = async () => {
  console.log('[BudgetAlert] Running budget alert check…');
  try {
    const users = await User.find({});

    for (const user of users) {
      const [txns, budgets] = await Promise.all([
        Transaction.find({ userId: user._id, type: 'expense', isRecurring: false }),
        Budget.find({ userId: user._id }),
      ]);

      if (budgets.length === 0) continue;

      const spendMap = {};
      txns.forEach(t => { spendMap[t.category] = (spendMap[t.category] || 0) + t.amount; });

      for (const budget of budgets) {
        const spent = spendMap[budget.category] || 0;
        const pct   = (spent / budget.limit) * 100;

        if (pct >= 100) {
          // Exceeded — only notify once (check if already sent today)
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const alreadyNotified = await Notification.findOne({
            userId: user._id,
            title: { $regex: budget.category },
            type: 'danger',
            createdAt: { $gte: today },
          });
          if (!alreadyNotified) {
            await Notification.create({
              userId: user._id,
              title: `${budget.category} budget exceeded! 🚨`,
              body:  `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${budget.limit.toLocaleString('en-IN')} ${budget.category} budget (${Math.round(pct)}% used).`,
              type:  'danger',
              icon:  '🚨',
              link:  '/budgets',
            });
          }
        } else if (pct >= 80) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const alreadyNotified = await Notification.findOne({
            userId: user._id,
            title: { $regex: budget.category },
            type: 'warning',
            createdAt: { $gte: today },
          });
          if (!alreadyNotified) {
            await Notification.create({
              userId: user._id,
              title: `${budget.category} budget at ${Math.round(pct)}% ⚠️`,
              body:  `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${budget.limit.toLocaleString('en-IN')} limit. ₹${(budget.limit - spent).toLocaleString('en-IN')} remaining.`,
              type:  'warning',
              icon:  '⚠️',
              link:  '/budgets',
            });
          }
        }
      }
    }
    console.log('[BudgetAlert] Done.');
  } catch (err) {
    console.error('[BudgetAlert] Error:', err.message);
  }
};

module.exports = { runBudgetAlerts };
